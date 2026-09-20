import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface MemberAuthPayload {
  id: number;
  memberId: number;
  email: string;
  name: string;
  subjectType: "MEMBER";
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      member?: MemberAuthPayload;
    }
  }
}

export async function memberAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token no proporcionado",
    });
  }

  try {
    const decoded = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    if (
      decoded.subjectType !== "MEMBER" ||
      !Number.isSafeInteger(decoded.id) ||
      !Number.isSafeInteger(decoded.memberId) ||
      !Number.isSafeInteger(decoded.tokenVersion)
    ) {
      return res.status(401).json({
        message: "Token móvil inválido",
      });
    }

    const account = await prisma.memberAccount.findUnique({
      where: { id: decoded.id },
      include: { member: true },
    });

    if (
      !account ||
      account.memberId !== decoded.memberId ||
      account.tokenVersion !== decoded.tokenVersion ||
      account.member.status !== "ACTIVO"
    ) {
      return res.status(401).json({
        message: "La sesión móvil venció",
      });
    }

    req.member = {
      id: account.id,
      memberId: account.memberId,
      email: account.member.email,
      name: `${account.member.firstName} ${account.member.lastName}`,
      subjectType: "MEMBER",
      tokenVersion: account.tokenVersion,
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
}