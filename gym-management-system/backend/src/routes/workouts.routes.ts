import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      include: {
        member: true,
        items: { include: { exercise: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(workouts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al listar rutinas" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        member: true,
        items: { include: { exercise: true } },
      },
    });

    if (!workout) {
      return res.status(404).json({ message: "Rutina no encontrada" });
    }

    return res.json(workout);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener rutina" });
  }
});

// body: { name, memberId, items: [{ exerciseId, sets, reps, weight }] }
router.post("/", async (req, res) => {
  try {
    const { name, memberId, items } = req.body;

    if (!name || !memberId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Nombre, socio y al menos un ejercicio son obligatorios",
      });
    }

    const workout = await prisma.workout.create({
      data: {
        name,
        memberId: Number(memberId),
        items: {
          create: items.map((it: any) => ({
            exerciseId: Number(it.exerciseId),
            sets: Number(it.sets),
            reps: Number(it.reps),
            weight: Number(it.weight),
          })),
        },
      },
      include: {
        member: true,
        items: { include: { exercise: true } },
      },
    });

    return res.status(201).json(workout);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al crear rutina" });
  }
});

export default router;
