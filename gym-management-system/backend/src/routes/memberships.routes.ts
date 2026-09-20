import { Request, Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

function isAdmin(req: Request, res: any): boolean {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ message: "Solo un administrador puede gestionar membresías" });
    return false;
  }
  return true;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get("/", async (_req, res) => {
  if (!isAdmin(_req, res)) return;

  try {
    const memberships = await prisma.membership.findMany({
      include: { member: true },
      orderBy: { expiresAt: "desc" },
    });
    return res.json(memberships);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudieron listar las membresías" });
  }
});

router.post("/", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const { memberId, planName, startsAt, expiresAt, price } = req.body ?? {};
  const parsedMemberId = Number(memberId);
  const start = parseDate(startsAt);
  const expiration = parseDate(expiresAt);
  const parsedPrice = Number(price);

  if (
    !Number.isSafeInteger(parsedMemberId) || parsedMemberId <= 0 ||
    typeof planName !== "string" || !planName.trim() ||
    !start || !expiration || expiration <= start ||
    !Number.isFinite(parsedPrice) || parsedPrice < 0
  ) {
    return res.status(400).json({ message: "Datos de membresía inválidos" });
  }

  try {
    const member = await prisma.member.findUnique({ where: { id: parsedMemberId } });
    if (!member) return res.status(404).json({ message: "Socio no encontrado" });

    const membership = await prisma.membership.create({
      data: {
        memberId: parsedMemberId,
        planName: planName.trim(),
        startsAt: start,
        expiresAt: expiration,
        price: parsedPrice,
      },
      include: { member: true },
    });

    return res.status(201).json(membership);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo crear la membresía" });
  }
});

router.put("/:id", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de membresía inválido" });
  }

  const current = await prisma.membership.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ message: "Membresía no encontrada" });

  const { planName, startsAt, expiresAt, price, status } = req.body ?? {};
  const start = startsAt === undefined ? current.startsAt : parseDate(startsAt);
  const expiration = expiresAt === undefined ? current.expiresAt : parseDate(expiresAt);
  const parsedPrice = price === undefined ? undefined : Number(price);

  if (
    !start || !expiration || expiration <= start ||
    (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) ||
    (status !== undefined && !["ACTIVA", "VENCIDA", "CANCELADA"].includes(status))
  ) {
    return res.status(400).json({ message: "Datos de membresía inválidos" });
  }

  try {
    const membership = await prisma.membership.update({
      where: { id },
      data: {
        planName: planName === undefined ? undefined : String(planName).trim(),
        startsAt: start,
        expiresAt: expiration,
        price: parsedPrice,
        status,
      },
      include: { member: true },
    });
    return res.json(membership);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "No se pudo actualizar la membresía" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de membresía inválido" });
  }

  try {
    await prisma.membership.delete({ where: { id } });
    return res.json({ message: "Membresía eliminada correctamente" });
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === "P2025") {
      return res.status(404).json({ message: "Membresía no encontrada" });
    }
    console.error(error);
    return res.status(500).json({ message: "No se pudo eliminar la membresía" });
  }
});

export default router;
