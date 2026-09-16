import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { date: "asc" },
    });
    return res.json(classes);
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

// Reservar cupo de prueba (opcional, simple)
router.patch("/:id/book", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.class.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Clase no encontrada" });
    }

    if (existing.booked >= existing.capacity) {
      return res.status(400).json({ message: "No hay cupos disponibles" });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: { booked: existing.booked + 1 },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al reservar cupo" });
  }
});

export default router;
