import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  createInitialEmailVerification,
  generateMemberEmailVerification,
  confirmMemberEmailVerification,
  EmailVerificationError,
  withMemberLock,
} from "../services/emailVerification.service";
import { sendVerificationEmail } from "../services/mail.service";

const router = Router();

router.use(authMiddleware);

function parseMemberId(value: string): number {
  const id = Number(value);

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw new EmailVerificationError(
      400,
      "El ID del socio debe ser un entero positivo"
    );
  }

  return id;
}

function handleVerificationError(
  res: Response,
  error: unknown
) {
  if (error instanceof EmailVerificationError) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  const details = error as { code?: string } | null;

  console.error("Error interno de verificación:", {
    code: details?.code ?? "SIN_CODIGO",
  });

  return res.status(500).json({
    message: "No se pudo completar la operación de verificación",
  });
}

// POST /api/members/:id/email-verification/send
router.post("/:id/email-verification/send", async (req, res) => {
  try {
    const memberId = parseMemberId(req.params.id);

    // Toma el destinatario de la base de datos.
    const verification =
      await generateMemberEmailVerification(memberId);

    // La transacción ya terminó.
    try {
      await sendVerificationEmail(verification);
    } catch (error: unknown) {
      const details = error as {
        code?: string;
        responseCode?: number;
      } | null;

      console.error("Error al enviar código:", {
        memberId,
        code: details?.code ?? "SIN_CODIGO",
        responseCode: details?.responseCode,
      });

      return res.status(502).json({
        delivery: "unconfirmed",
        message:
          "No se pudo confirmar el envío. Espera al menos 60 segundos antes de solicitar otro código.",
      });
    }

    // No devolver el código ni su hash.
    return res.status(200).json({
      delivery: "accepted",
      message: "El proveedor aceptó el envío del código",
      expiresAt: verification.expiresAt,
    });
  } catch (error) {
    return handleVerificationError(res, error);
  }
});

// POST /api/members/:id/email-verification/confirm
router.post("/:id/email-verification/confirm", async (req, res) => {
  try {
    const memberId = parseMemberId(req.params.id);
    const code = req.body?.code;

    // Debe ser texto para conservar ceros iniciales.
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "El código debe ser un texto de exactamente 6 dígitos",
      });
    }

    const emailVerifiedAt =
      await confirmMemberEmailVerification(memberId, code);

    return res.status(200).json({
      message: "Correo verificado correctamente",
      memberId,
      emailVerifiedAt,
    });
  } catch (error) {
    return handleVerificationError(res, error);
  }
});

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

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          firstName,
          lastName,
          cedula,
          email,
          phone,
        },
      });

      const verification = await createInitialEmailVerification(
        tx,
        member
      );

      return { member, verification };
    });

    let emailDelivery: "accepted" | "unconfirmed" = "unconfirmed";

    try {
      await sendVerificationEmail({
        email: result.verification.email,
        code: result.verification.code,
        expiresAt: result.verification.expiresAt,
      });

      emailDelivery = "accepted";
    } catch (err: unknown) {
      const smtpError = err as {
        code?: string;
        responseCode?: number;
        command?: string;
      };

      console.error("Error SMTP:", {
        memberId: result.member.id,
        code: smtpError?.code ?? "SIN_CODIGO",
        responseCode: smtpError?.responseCode,
        command: smtpError?.command,
      });
    }

    return res.status(201).json({
      ...result.member,
      emailVerification: {
        delivery: emailDelivery,
        message:
          emailDelivery === "accepted"
            ? "Socio creado. El código fue aceptado por el servidor de correo."
            : "Socio creado, pero no se pudo confirmar el envío del código.",
      },
    });
    

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
    const id = parseMemberId(req.params.id);
    const { firstName, lastName, cedula, email, phone } =
      req.body;

    if (
      email !== undefined &&
      (typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      return res.status(400).json({
        message: "Introduce un correo electrónico válido",
      });
    }

    const member = await withMemberLock(id, async (tx) => {
      const current = await tx.member.findUniqueOrThrow({
        where: { id },
      });

      const nextEmail =
        email === undefined ? current.email : email.trim();

      const emailChanged = nextEmail !== current.email;

      if (emailChanged) {
        // Invalida el código sin borrar los contadores de envío.
        await tx.memberEmailVerification.updateMany({
          where: { memberId: id },
          data: {
            expiresAt: new Date(0),
          },
        });
      }

      return tx.member.update({
        where: { id },
        data: {
          firstName,
          lastName,
          cedula,
          email: nextEmail,
          phone,
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
      });
    });

    return res.json(member);
  } catch (error: unknown) {
    if (
      (error as { code?: string } | null)?.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Ya existe un socio con esa cédula",
      });
    }

    return handleVerificationError(res, error);
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
