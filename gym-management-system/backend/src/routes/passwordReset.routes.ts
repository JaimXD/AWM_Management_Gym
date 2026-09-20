import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { sendPasswordResetEmail } from "../services/mail.service";

const router = Router();
const GENERIC_MESSAGE =
  "Si el correo corresponde a una cuenta y puedes solicitar otro enlace, recibirás las instrucciones. Revisa también spam.";
const HOUR = 60 * 60 * 1000;

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Pública: el usuario todavía no puede iniciar sesión.
router.post("/forgot-password", requestLimiter, async (req, res) => {
  const rawEmail = req.body?.email;
  if (
    typeof rawEmail !== "string" || rawEmail.length > 254 ||
    !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(rawEmail.trim())
  ) {
    return res.status(400).json({ message: "Introduce un correo válido." });
  }

  const email = rawEmail.trim();
  // Respondemos ANTES de buscar la cuenta o enviar el mensaje para no
  // revelar su existencia mediante la respuesta ni el tiempo de envío.
  res.status(202).json({ message: GENERIC_MESSAGE });

  try {
    const pending = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "User" WHERE "email" = ${email} FOR UPDATE
      `;
      if (!rows.length) return null;

      const user = await tx.user.findUniqueOrThrow({
        where: { id: rows[0].id },
        include: { passwordReset: true },
      });
      const previous = user.passwordReset;
      const now = new Date();
      if (previous && now.getTime() - previous.createdAt.getTime() < 60_000) {
        return null;
      }
      const sameWindow = previous !== null &&
        now.getTime() - previous.windowStartedAt.getTime() < HOUR;
      if (sameWindow && previous && previous.sendCount >= 3) return null;

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      const data = {
        email: user.email,
        tokenHash: hashToken(token),
        expiresAt,
        usedAt: null,
        createdAt: now,
        windowStartedAt: sameWindow && previous ? previous.windowStartedAt : now,
        sendCount: sameWindow && previous ? previous.sendCount + 1 : 1,
      };
      await tx.passwordReset.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...data },
        update: data,
      });
      return { email: user.email, token, expiresAt };
    });

    // El correo se envía fuera de la transacción.
    if (pending) await sendPasswordResetEmail(pending);
  } catch (error: unknown) {
    // No registrar enlaces, tokens, contraseñas ni el cuerpo de la petición.
    console.error("Fallo al procesar recuperación de contraseña", {
      code: (error as { code?: string } | null)?.code ?? "UNKNOWN",
    });
  }
});

router.post("/reset-password", resetLimiter, async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: "Enlace inválido o vencido. Solicita otro." });
  }
  if (typeof password !== "string" || password.length < 12) {
    return res.status(400).json({ message: "Usa una contraseña de al menos 12 caracteres." });
  }
  // bcrypt solo utiliza los primeros 72 bytes: rechazar en lugar de truncar.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "La contraseña es demasiado larga. Usa menos caracteres." });
  }

  try {
    const tokenHash = hashToken(token);
    const candidate = await prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!candidate) {
      return res.status(400).json({ message: "Enlace inválido o vencido. Solicita otro." });
    }

    const changed = await prisma.$transaction(async (tx) => {
      // Mismo orden de bloqueo que al solicitar: primero User.
      // Dos peticiones simultáneas no pueden consumir el mismo enlace.
      const rows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "User" WHERE "id" = ${candidate.userId} FOR UPDATE
      `;
      if (!rows.length) return false;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: candidate.userId },
        include: { passwordReset: true },
      });
      const reset = user.passwordReset;
      if (
        !reset || reset.tokenHash !== tokenHash || reset.usedAt ||
        reset.email !== user.email || reset.expiresAt.getTime() <= Date.now()
      ) return false;

      const passwordHash = await bcrypt.hash(password, 12);
      const now = new Date();
      if (reset.expiresAt.getTime() <= now.getTime()) return false;

      await tx.passwordReset.update({
        where: { userId: user.id },
        data: { usedAt: now },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { password: passwordHash, tokenVersion: { increment: 1 } },
      });
      return true;
    }, { timeout: 15_000 });

    if (!changed) {
      return res.status(400).json({ message: "Enlace inválido o vencido. Solicita otro." });
    }
    return res.json({ message: "Contraseña actualizada. Inicia sesión nuevamente." });
  } catch {
    return res.status(500).json({ message: "No se pudo actualizar la contraseña. Intenta nuevamente." });
  }
});

export default router;
