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

      const gymClass = await tx.class.findUnique({ where: { id: classId } });
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

  try {
    const reservation = await prisma.classReservation.findUnique({
      where: { classId_memberId: { classId, memberId } },
    });

    if (!reservation || reservation.status !== "RESERVADA") {
      return res.status(404).json({ message: "Reserva no encontrada" });
    }

    await prisma.$transaction([
      prisma.classReservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELADA", cancelledAt: new Date() },
      }),
      prisma.class.update({
        where: { id: classId },
        data: { booked: { decrement: 1 } },
      }),
    ]);

    return res.json({ message: "Reserva cancelada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo cancelar la reserva" });
  }
});

export default router;