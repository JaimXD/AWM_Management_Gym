import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_req, res) => {
  try {
    const exercises = await prisma.exercise.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json(exercises);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al listar ejercicios" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, muscleGroup, difficulty, description, imageUrl, mediaType } = req.body;

    if (!name || !muscleGroup || !difficulty || !description) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    if (mediaType !== undefined && !["IMAGE", "GIF"].includes(mediaType)) {
      return res.status(400).json({ message: "El tipo de recurso debe ser IMAGE o GIF" });
    }

    const exercise = await prisma.exercise.create({
      data: { name, muscleGroup, difficulty, description, imageUrl, mediaType },
    });

    return res.status(201).json(exercise);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al crear ejercicio" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, muscleGroup, difficulty, description, imageUrl, mediaType } = req.body;

    if (mediaType !== undefined && !["IMAGE", "GIF"].includes(mediaType)) {
      return res.status(400).json({ message: "El tipo de recurso debe ser IMAGE o GIF" });
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: { name, muscleGroup, difficulty, description, imageUrl, mediaType },
    });

    return res.json(exercise);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar ejercicio" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { active } = req.body;

    const exercise = await prisma.exercise.update({
      where: { id },
      data: { active },
    });

    return res.json(exercise);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al cambiar estado del ejercicio" });
  }
});

export default router;
