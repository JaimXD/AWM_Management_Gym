import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "express-rate-limit";
import {
  confirmUserEmailVerification,
  createInitialUserEmailVerification,
  EmailVerificationError,
} from "../services/emailVerification.service";
import { sendVerificationEmail } from "../services/mail.service";

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiadas solicitudes. Intenta nuevamente en 15 minutos.",
  },
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        message: "Debes verificar tu correo antes de iniciar sesión",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      tokenVersion: user.tokenVersion,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "8h",
    });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});


// POST /api/auth/register
router.post("/register", registerLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 120
  ) {
    return res.status(400).json({
      message: "Introduce un nombre de entre 1 y 120 caracteres",
    });
  }

  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      message: "Introduce un correo válido",
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "La contraseña debe tener al menos 12 caracteres y máximo 72 bytes",
    });
  }

  try {
    const role = await prisma.role.findUnique({
      where: { name: "TRAINER" },
    });

    if (!role) {
      return res.status(500).json({
        message: "No está configurado el rol TRAINER",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: passwordHash,
          roleId: role.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      });

      const verification = await createInitialUserEmailVerification(tx, user);
      return { user, verification };
    });

    let delivery: "accepted" | "unconfirmed" = "unconfirmed";

    try {
      await sendVerificationEmail(result.verification);
      delivery = "accepted";
    } catch (error) {
      console.error("No se pudo enviar la verificación de usuario:", error);
    }

    return res.status(201).json({
      message: "Usuario registrado. Debes verificar tu correo antes de iniciar sesión",
      delivery,
      user: result.user,
    });
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === "P2002") {
      return res.status(409).json({
        message: "Ya existe un usuario con ese correo",
      });
    }

    return res.status(500).json({
      message: "No se pudo registrar el usuario",
    });
  }
});

router.post("/verify-email", async (req, res) => {
  const userId = Number(req.body?.userId);
  const code = req.body?.code;

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return res.status(400).json({
      message: "El código debe ser un texto de exactamente 6 dígitos",
    });
  }

  try {
    const emailVerifiedAt = await confirmUserEmailVerification(userId, code);

    return res.json({
      message: "Correo verificado correctamente",
      emailVerifiedAt,
    });
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error al verificar correo de usuario:", error);
    return res.status(500).json({ message: "No se pudo verificar el correo" });
  }
});

export default router;
