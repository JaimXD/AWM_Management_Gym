import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        _count: {
          select: {
            reservations: { where: { status: "RESERVADA" } },
          },
        },
      },
      orderBy: { date: "asc" },
    });
    return res.json(classes.map(({ _count, ...gymClass }) => ({
      ...gymClass,
      booked: _count.reservations,
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al listar clases" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, instructor, date, capacity } = req.body;

    if (!name || !instructor || !date || !capacity) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        instructor,
        date: new Date(date),
        capacity: Number(capacity),
      },
    });

    return res.status(201).json(newClass);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al crear clase" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, instructor, date, capacity } = req.body;

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name,
        instructor,
        date: date ? new Date(date) : undefined,
        capacity: capacity ? Number(capacity) : undefined,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar clase" });
  }
});

router.get("/:id/reservations", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de clase inválido" });
  }

  try {
    const reservations = await prisma.classReservation.findMany({
      where: { classId: id },
      include: { member: true },
      orderBy: { bookedAt: "asc" },
    });

    const gymClass = await prisma.class.findUnique({ where: { id } });
    if (!gymClass) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    return res.json(reservations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudieron listar las reservas" });
  }
});

router.patch("/:classId/reservations/:reservationId/attendance", async (req, res) => {
  const classId = Number(req.params.classId);
  const reservationId = Number(req.params.reservationId);

  if (
    !Number.isSafeInteger(classId) || classId <= 0 ||
    !Number.isSafeInteger(reservationId) || reservationId <= 0
  ) {
    return res.status(400).json({ message: "Identificador de reserva inválido" });
  }

  try {
    const reservation = await prisma.classReservation.findFirst({
      where: { id: reservationId, classId },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reserva no encontrada" });
    }

    if (reservation.status === "CANCELADA") {
      return res.status(409).json({ message: "Una reserva cancelada no puede marcarse como asistencia" });
    }

    const updated = await prisma.classReservation.update({
      where: { id: reservationId },
      data: {
        status: "ASISTIO",
        attendedAt: new Date(),
      },
      include: { member: true, class: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo registrar la asistencia" });
  }
});

router.delete("/:classId/reservations/:reservationId", async (req, res) => {
  const classId = Number(req.params.classId);
  const reservationId = Number(req.params.reservationId);

  if (
    !Number.isSafeInteger(classId) || classId <= 0 ||
    !Number.isSafeInteger(reservationId) || reservationId <= 0
  ) {
    return res.status(400).json({ message: "Identificador de reserva inválido" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const gymClass = await tx.class.findUnique({ where: { id: classId } });
      const reservation = await tx.classReservation.findFirst({
        where: { id: reservationId, classId },
      });

      if (!gymClass || !reservation) return { error: "NOT_FOUND" as const };
      if (reservation.status !== "RESERVADA") return { error: "NOT_ACTIVE" as const };

      await tx.classReservation.update({
        where: { id: reservationId },
        data: { status: "CANCELADA", cancelledAt: new Date() },
      });
      await tx.class.update({
        where: { id: classId },
        data: { booked: { decrement: 1 } },
      });

      return { ok: true };
    });

    if ("error" in result) {
      return res.status(result.error === "NOT_FOUND" ? 404 : 409).json({
        message: result.error === "NOT_FOUND"
          ? "Reserva o clase no encontrada"
          : "La reserva ya no está activa",
      });
    }

    return res.json({ message: "Reserva cancelada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo cancelar la reserva" });
  }
});

export default router;
