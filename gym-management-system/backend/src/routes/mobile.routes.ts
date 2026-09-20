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
    },
  });

  return res.json({ member });
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

export default router;