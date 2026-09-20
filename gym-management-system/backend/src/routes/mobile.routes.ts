import { Router } from "express";
import { prisma } from "../lib/prisma";
import { memberAuthMiddleware } from "../middleware/memberAuth";

const router = Router();

router.use(memberAuthMiddleware);

router.get("/me", async (req, res) => {
  const memberId = req.member!.memberId;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      emailVerifiedAt: true,
      memberships: {
        where: { status: "ACTIVA" },
        orderBy: { expiresAt: "desc" },
        take: 1,
      },
    },
  });

  if (!member) return res.status(404).json({ message: "Socio no encontrado" });

  const membership = member.memberships[0] ?? null;
  const daysRemaining = membership
    ? Math.max(0, Math.ceil((membership.expiresAt.getTime() - Date.now()) / 86_400_000))
    : 0;

  return res.json({
    member: { ...member, memberships: undefined },
    membership: membership ? { ...membership, daysRemaining } : null,
  });
});

router.get("/membership", async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { memberId: req.member!.memberId },
    orderBy: { expiresAt: "desc" },
  });

  return res.json({
    memberships: memberships.map((membership) => ({
      ...membership,
      daysRemaining: Math.max(
        0,
        Math.ceil((membership.expiresAt.getTime() - Date.now()) / 86_400_000)
      ),
    })),
  });
});

router.get("/workouts", async (req, res) => {
  const memberId = req.member!.memberId;

  const workouts = await prisma.workout.findMany({
    where: { memberId },
    include: {
      items: {
        include: {
          exercise: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json(workouts);
});

router.get("/workout/today", async (req, res) => {
  const memberId = req.member!.memberId;
  const today = new Date();
  const dayOfWeek = ((today.getDay() + 6) % 7) + 1;
  const completedDate = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const workouts = await prisma.workout.findMany({
    where: { memberId },
    include: {
      items: {
        where: { dayOfWeek },
        include: {
          exercise: true,
          completions: {
            where: { completedDate },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    date: completedDate.toISOString().slice(0, 10),
    dayOfWeek,
    workouts,
  });
});

router.patch("/workout-exercises/:id/complete", async (req, res) => {
  const workoutExerciseId = Number(req.params.id);
  const memberId = req.member!.memberId;

  if (!Number.isSafeInteger(workoutExerciseId) || workoutExerciseId <= 0) {
    return res.status(400).json({ message: "ID de ejercicio de rutina inválido" });
  }

  const now = new Date();
  const completedDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );

  try {
    const workoutExercise = await prisma.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: { memberId },
      },
    });

    if (!workoutExercise) {
      return res.status(404).json({ message: "Ejercicio de rutina no encontrado" });
    }

    const completion = await prisma.workoutExerciseCompletion.upsert({
      where: {
        workoutExerciseId_completedDate: {
          workoutExerciseId,
          completedDate,
        },
      },
      create: { workoutExerciseId, completedDate },
      update: { completedAt: now },
    });

    return res.status(201).json({
      message: "Ejercicio marcado como completado",
      completion,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo guardar el progreso" });
  }
});

router.get("/progress", async (req, res) => {
  const memberId = req.member!.memberId;

  const progress = await prisma.workoutExerciseCompletion.findMany({
    where: {
      workoutExercise: {
        workout: { memberId },
      },
    },
    include: {
      workoutExercise: {
        include: {
          workout: true,
          exercise: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  return res.json({ progress });
});

router.get("/classes", async (_req, res) => {
  const classes = await prisma.class.findMany({
    where: {
      date: {
        gte: new Date(),
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return res.json(classes);
});

router.get("/reservations", async (req, res) => {
  const reservations = await prisma.classReservation.findMany({
    where: { memberId: req.member!.memberId },
    include: { class: true },
    orderBy: { bookedAt: "desc" },
  });

  return res.json({ reservations });
});

router.post("/classes/:id/reservation", async (req, res) => {
  const classId = Number(req.params.id);
  const memberId = req.member!.memberId;

  if (!Number.isSafeInteger(classId) || classId <= 0) {
    return res.status(400).json({ message: "ID de clase inválido" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const membership = await tx.membership.findFirst({
        where: {
          memberId,
          status: "ACTIVA",
          startsAt: { lte: now },
          expiresAt: { gt: now },
        },
      });

      if (!membership) return { error: "MEMBERSHIP_EXPIRED" as const };

      const classRows = await tx.$queryRaw<Array<{
        id: number;
        name: string;
        instructor: string;
        date: Date;
        capacity: number;
        booked: number;
        createdAt: Date;
      }>>`
        SELECT "id", "name", "instructor", "date", "capacity", "booked", "createdAt"
        FROM "Class"
        WHERE "id" = ${classId}
        FOR UPDATE
      `;
      const gymClass = classRows[0];
      if (!gymClass || gymClass.date <= now) return { error: "CLASS_UNAVAILABLE" as const };
      if (gymClass.booked >= gymClass.capacity) return { error: "CLASS_FULL" as const };

      const existing = await tx.classReservation.findUnique({
        where: { classId_memberId: { classId, memberId } },
      });
      if (existing?.status === "RESERVADA") return { error: "ALREADY_RESERVED" as const };

      const reservation = existing
        ? await tx.classReservation.update({
            where: { id: existing.id },
            data: { status: "RESERVADA", cancelledAt: null },
          })
        : await tx.classReservation.create({ data: { classId, memberId } });

      await tx.class.update({
        where: { id: classId },
        data: { booked: { increment: 1 } },
      });

      return { reservation };
    }, { isolationLevel: "Serializable" });

    if ("error" in result) {
      if (result.error === "MEMBERSHIP_EXPIRED") {
        return res.status(403).json({ message: "No puedes reservar porque tu membresía está vencida" });
      }
      if (result.error === "CLASS_UNAVAILABLE") {
        return res.status(404).json({ message: "La clase no está disponible" });
      }
      if (result.error === "CLASS_FULL") {
        return res.status(409).json({ message: "No hay cupos disponibles" });
      }
      return res.status(409).json({ message: "Ya tienes una reserva para esta clase" });
    }

    return res.status(201).json(result.reservation);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo reservar la clase" });
  }
});

router.delete("/classes/:id/reservation", async (req, res) => {
  const classId = Number(req.params.id);
  const memberId = req.member!.memberId;

  if (!Number.isSafeInteger(classId) || classId <= 0) {
    return res.status(400).json({ message: "ID de clase inválido" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const classRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "Class"
        WHERE "id" = ${classId}
        FOR UPDATE
      `;

      if (!classRows.length) return { error: "CLASS_NOT_FOUND" as const };

      const reservation = await tx.classReservation.findUnique({
        where: { classId_memberId: { classId, memberId } },
      });

      if (!reservation || reservation.status !== "RESERVADA") {
        return { error: "RESERVATION_NOT_FOUND" as const };
      }

      await tx.classReservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELADA", cancelledAt: new Date() },
      });
      await tx.class.update({
        where: { id: classId },
        data: { booked: { decrement: 1 } },
      });

      return { ok: true };
    });

    if ("error" in result) {
      return res.status(404).json({
        message: result.error === "CLASS_NOT_FOUND"
          ? "Clase no encontrada"
          : "Reserva no encontrada",
      });
    }

    return res.json({ message: "Reserva cancelada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo cancelar la reserva" });
  }
});

export default router;