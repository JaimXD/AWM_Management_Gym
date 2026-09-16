import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/summary", async (_req, res) => {
  try {
    const [activeMembers, totalMembers, totalExercises, upcomingClasses, latestMembers, allClasses] =
      await Promise.all([
        prisma.member.count({ where: { status: "ACTIVO" } }),
        prisma.member.count(),
        prisma.exercise.count({ where: { active: true } }),
        prisma.class.count({ where: { date: { gte: new Date() } } }),
        prisma.member.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.class.findMany({ orderBy: { date: "asc" }, take: 6 }),
      ]);

    const bookingsByClass = allClasses.map((c) => ({
      name: c.name,
      reservas: c.booked,
      capacidad: c.capacity,
    }));

    return res.json({
      cards: {
        activeMembers,
        totalMembers,
        totalExercises,
        upcomingClasses,
      },
      latestMembers,
      nextClasses: allClasses.slice(0, 5),
      bookingsByClass,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener resumen del dashboard" });
  }
});

export default router;
