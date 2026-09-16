import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

// GET /api/members?search=
router.get("/", async (req, res) => {
  try {
    const search = (req.query.search as string) || "";

    const members = await prisma.member.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { cedula: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return res.json(members);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al listar socios" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, cedula, email, phone } = req.body;

    if (!firstName || !lastName || !cedula || !email || !phone) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const member = await prisma.member.create({
      data: { firstName, lastName, cedula, email, phone },
    });

    return res.status(201).json(member);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Ya existe un socio con esa cédula" });
    }
    console.error(err);
    return res.status(500).json({ message: "Error al crear socio" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { firstName, lastName, cedula, email, phone } = req.body;

    const member = await prisma.member.update({
      where: { id },
      data: { firstName, lastName, cedula, email, phone },
    });

    return res.json(member);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar socio" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const member = await prisma.member.update({
      where: { id },
      data: { status },
    });

    return res.json(member);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al cambiar estado del socio" });
  }
});

export default router;
