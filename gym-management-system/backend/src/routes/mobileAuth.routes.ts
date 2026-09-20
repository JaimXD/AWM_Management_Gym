import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import {
  generateMemberEmailVerification,
  confirmMemberEmailVerification,
  EmailVerificationError,
} from "../services/emailVerification.service";
import { sendVerificationEmail } from "../services/mail.service";
import { randomBytes, createHash } from "node:crypto";
import { sendPasswordResetEmail } from "../services/mail.service";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}


const router = Router();

function signMemberToken(account: {
  id: number;
  memberId: number;
  tokenVersion: number;
  email: string;
  name: string;
}) {
  return jwt.sign(
    {
      id: account.id,
      memberId: account.memberId,
      email: account.email,
      name: account.name,
      subjectType: "MEMBER",
      tokenVersion: account.tokenVersion,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "8h" }
  );
}

router.post("/register", async (req, res) => {
  const { cedula, email, password } = req.body ?? {};

  if (
    typeof cedula !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Cédula, correo y contraseña son obligatorios",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({
      message: "Introduce un correo válido",
    });
  }

  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      message: "La contraseña debe tener entre 12 y 72 bytes",
    });
  }

  try {
    const member = await prisma.member.findFirst({
      where: {
        cedula: cedula.trim(),
        email: normalizedEmail,
        status: "ACTIVO",
      },
      include: {
        account: true,
      },
    });

    if (!member) {
      return res.status(404).json({
        message: "No existe un socio activo con esos datos",
      });
    }

    if (member.account) {
      return res.status(409).json({
        message: "El socio ya tiene una cuenta móvil",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.memberAccount.create({
      data: {
        memberId: member.id,
        passwordHash,
      },
    });

    if (!member.emailVerifiedAt) {
      const verification = await generateMemberEmailVerification(member.id);

      try {
        await sendVerificationEmail(verification);
      } catch (error) {
        console.error("No se pudo enviar verificación móvil", error);
      }
    }

    return res.status(201).json({
      memberId: member.id,
      email: member.email,
      verificationRequired: !member.emailVerifiedAt,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "No se pudo crear la cuenta móvil",
    });
  }
});

router.post("/verify-email", async (req, res) => {
  const memberId = Number(req.body?.memberId);
  const code = req.body?.code;

  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    return res.status(400).json({
      message: "ID de socio inválido",
    });
  }

  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return res.status(400).json({
      message: "El código debe tener exactamente 6 dígitos",
    });
  }

  try {
    const account = await prisma.memberAccount.findUnique({
      where: { memberId },
    });

    if (!account) {
      return res.status(404).json({
        message: "La cuenta móvil no existe",
      });
    }

    await confirmMemberEmailVerification(memberId, code);

    return res.json({
      message: "Correo verificado correctamente",
      memberId,
    });
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "No se pudo verificar el correo",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      message: "Correo y contraseña son obligatorios",
    });
  }

  const account = await prisma.memberAccount.findFirst({
    where: {
      member: {
        email: email.trim().toLowerCase(),
        status: "ACTIVO",
      },
    },
    include: {
      member: true,
    },
  });

  if (!account) {
    return res.status(401).json({
      message: "Credenciales inválidas",
    });
  }

  const validPassword = await bcrypt.compare(
    password,
    account.passwordHash
  );

  if (!validPassword) {
    return res.status(401).json({
      message: "Credenciales inválidas",
    });
  }

  if (!account.member.emailVerifiedAt) {
    return res.status(403).json({
      message: "Debes verificar tu correo antes de iniciar sesión",
      code: "EMAIL_NOT_VERIFIED",
      memberId: account.memberId,
    });
  }

  const token = signMemberToken({
    id: account.id,
    memberId: account.memberId,
    tokenVersion: account.tokenVersion,
    email: account.member.email,
    name: `${account.member.firstName} ${account.member.lastName}`,
  });

  return res.json({
    token,
    member: {
      id: account.memberId,
      name: `${account.member.firstName} ${account.member.lastName}`,
      email: account.member.email,
    },
  });
});

router.post("/forgot-password", async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();

  // Respuesta genérica para no revelar si el correo existe.
  res.status(202).json({
    message: "Si la cuenta existe, recibirás instrucciones por correo",
  });

  try {
    const account = await prisma.memberAccount.findFirst({
      where: {
        member: {
          email,
          status: "ACTIVO",
        },
      },
      include: {
        member: true,
      },
    });

    if (!account) return;

    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    await prisma.memberPasswordReset.upsert({
      where: {
        memberAccountId: account.id,
      },
      create: {
        memberAccountId: account.id,
        email: account.member.email,
        tokenHash: hashToken(token),
        expiresAt,
      },
      update: {
        email: account.member.email,
        tokenHash: hashToken(token),
        expiresAt,
        usedAt: null,
        createdAt: now,
      },
    });

    await sendPasswordResetEmail({
      email: account.member.email,
      token,
      expiresAt,
    });
  } catch (error) {
    console.error("Error en recuperación móvil", error);
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return res.status(400).json({
      message: "Token inválido o vencido",
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "La contraseña debe tener entre 12 y 72 bytes",
    });
  }

  const reset = await prisma.memberPasswordReset.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      memberAccount: true,
    },
  });

  if (
    !reset ||
    reset.usedAt ||
    reset.expiresAt.getTime() <= Date.now()
  ) {
    return res.status(400).json({
      message: "Token inválido o vencido",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.memberAccount.update({
      where: {
        id: reset.memberAccountId,
      },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
    }),
    prisma.memberPasswordReset.update({
      where: {
        id: reset.id,
      },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  return res.json({
    message: "Contraseña actualizada correctamente",
  });
});

export default router;