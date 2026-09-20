import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutos
const RESEND_INTERVAL_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_CODE_ATTEMPTS = 5;

export async function createInitialEmailVerification(
  tx: Prisma.TransactionClient,
  member: { id: number; email: string }
) {

  const code = randomInt(0, 1_000_000)
    .toString()
    .padStart(6, "0");

  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

  const verification = await tx.memberEmailVerification.create({
    data: {
      memberId: member.id,
      email: member.email,
      codeHash,
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      expiresAt: true,
    },
  });

  return {
    verificationId: verification.id,
    email: verification.email,
    expiresAt: verification.expiresAt,
    code,
  };
}

export class EmailVerificationError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "EmailVerificationError";
  }
}

// Bloquea el socio mientras dura la transacción.
// Así, confirmar, reenviar y editar su correo no se pisan entre sí.
export async function withMemberLock<T>(
  memberId: number,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // Consulta parametrizada para PostgreSQL.
      const rows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "Member"
        WHERE "id" = ${memberId}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new EmailVerificationError(404, "Socio no encontrado");
      }

      return operation(tx);
    },
    {
      maxWait: 5_000,
      timeout: 15_000,
    }
  );
}

export async function generateMemberEmailVerification(
  memberId: number
) {
  return withMemberLock(memberId, async (tx) => {
    const member = await tx.member.findUniqueOrThrow({
      where: { id: memberId },
      include: { emailVerification: true },
    });

    if (member.emailVerifiedAt) {
      throw new EmailVerificationError(
        409,
        "El correo de este socio ya está verificado"
      );
    }

    const previous = member.emailVerification;
    const now = new Date();

    if (previous) {
      const elapsed = now.getTime() - previous.createdAt.getTime();

      if (elapsed < RESEND_INTERVAL_MS) {
        const seconds = Math.ceil(
          (RESEND_INTERVAL_MS - elapsed) / 1000
        );

        throw new EmailVerificationError(
          429,
          `Espera ${seconds} segundos antes de solicitar otro código`
        );
      }
    }

    const sameWindow =
      previous !== null &&
      now.getTime() - previous.windowStartedAt.getTime() <
        SEND_WINDOW_MS;

    if (
      sameWindow &&
      previous &&
      previous.sendCount >= MAX_SENDS_PER_WINDOW
    ) {
      throw new EmailVerificationError(
        429,
        "Alcanzaste el máximo de 5 envíos por hora para este socio"
      );
    }

    let code = randomInt(0, 1_000_000)
      .toString()
      .padStart(6, "0");

    // Evita que el nuevo código coincida con el anterior.
    while (
      previous &&
      (await bcrypt.compare(code, previous.codeHash))
    ) {
      code = randomInt(0, 1_000_000)
        .toString()
        .padStart(6, "0");
    }

    const codeHash = await bcrypt.hash(code, 12);
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + CODE_EXPIRATION_MS
    );

    const challengeData = {
      email: member.email,
      codeHash,
      expiresAt,
      attempts: 0,
      usedAt: null,
      createdAt: issuedAt,
      windowStartedAt:
        sameWindow && previous
          ? previous.windowStartedAt
          : issuedAt,
      sendCount:
        sameWindow && previous ? previous.sendCount + 1 : 1,
    };

    await tx.memberEmailVerification.upsert({
      where: { memberId },
      create: {
        memberId,
        ...challengeData,
      },
      update: challengeData,
    });

    // Solo para uso interno del backend.
    return {
      email: member.email,
      code,
      expiresAt,
    };
  });
}

export async function confirmMemberEmailVerification(
  memberId: number,
  code: string
): Promise<Date> {
  const verifiedAt = await withMemberLock(
    memberId,
    async (tx) => {
      const member = await tx.member.findUniqueOrThrow({
        where: { id: memberId },
        include: { emailVerification: true },
      });

      if (member.emailVerifiedAt) {
        throw new EmailVerificationError(
          409,
          "El correo ya está verificado"
        );
      }

      const verification = member.emailVerification;

      if (!verification) {
        throw new EmailVerificationError(
          400,
          "Primero solicita un código de verificación"
        );
      }

      if (verification.email !== member.email) {
        throw new EmailVerificationError(
          400,
          "El correo cambió. Solicita un nuevo código"
        );
      }

      if (verification.usedAt) {
        throw new EmailVerificationError(
          409,
          "Este código ya fue utilizado"
        );
      }

      if (verification.expiresAt.getTime() <= Date.now()) {
        throw new EmailVerificationError(
          400,
          "El código venció. Solicita uno nuevo"
        );
      }

      if (verification.attempts >= MAX_CODE_ATTEMPTS) {
        throw new EmailVerificationError(
          429,
          "Agotaste los 5 intentos. Solicita un nuevo código"
        );
      }

      const matches = await bcrypt.compare(
        code,
        verification.codeHash
      );

      // Comprobar otra vez porque bcrypt tarda un tiempo.
      const now = new Date();

      if (verification.expiresAt.getTime() <= now.getTime()) {
        throw new EmailVerificationError(
          400,
          "El código venció. Solicita uno nuevo"
        );
      }

      if (!matches) {
        await tx.memberEmailVerification.update({
          where: { memberId },
          data: {
            attempts: { increment: 1 },
          },
        });

        // No lanzar aquí: eso revertiría el incremento.
        return null;
      }

      await tx.memberEmailVerification.update({
        where: { memberId },
        data: { usedAt: now },
      });

      await tx.member.update({
        where: { id: memberId },
        data: { emailVerifiedAt: now },
      });

      return now;
    }
  );

  // La transacción ya guardó el intento fallido.
  if (verifiedAt === null) {
    throw new EmailVerificationError(
      400,
      "Código incorrecto. Se contabilizó un intento fallido"
    );
  }

  return verifiedAt;
}

export async function createInitialUserEmailVerification(
  tx: Prisma.TransactionClient,
  user: { id: number; email: string }
) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

  await tx.userEmailVerification.create({
    data: {
      userId: user.id,
      email: user.email,
      codeHash,
      expiresAt,
    },
  });

  return { email: user.email, expiresAt, code };
}

export async function confirmUserEmailVerification(
  userId: number,
  code: string
): Promise<Date> {
  const verifiedAt = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { emailVerification: true },
    });

    if (!user) {
      throw new EmailVerificationError(404, "Usuario no encontrado");
    }

    if (user.emailVerifiedAt) {
      throw new EmailVerificationError(409, "El correo ya está verificado");
    }

    const verification = user.emailVerification;

    if (!verification) {
      throw new EmailVerificationError(
        400,
        "No existe un código de verificación para este usuario"
      );
    }

    if (verification.usedAt) {
      throw new EmailVerificationError(409, "Este código ya fue utilizado");
    }

    if (verification.expiresAt.getTime() <= Date.now()) {
      throw new EmailVerificationError(400, "El código venció");
    }

    if (verification.attempts >= MAX_CODE_ATTEMPTS) {
      throw new EmailVerificationError(
        429,
        "Agotaste los 5 intentos. Solicita un nuevo código"
      );
    }

    const matches = await bcrypt.compare(code, verification.codeHash);

    if (!matches) {
      await tx.userEmailVerification.update({
        where: { userId },
        data: { attempts: { increment: 1 } },
      });

      throw new EmailVerificationError(
        400,
        "Código incorrecto. Se contabilizó un intento fallido"
      );
    }

    const now = new Date();

    await tx.userEmailVerification.update({
      where: { userId },
      data: { usedAt: now },
    });

    await tx.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: now },
    });

    return now;
  });

  return verifiedAt;
}