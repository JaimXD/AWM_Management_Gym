import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface AuthPayload {
  id: number;
  email: string;
  name: string;
  role: "ADMIN" | "TRAINER";
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authMiddleware(
  req: Request, res: Response, next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  let decoded: jwt.JwtPayload;
  try {
    const value = jwt.verify(header.slice(7), process.env.JWT_SECRET as string);
    if (typeof value === "string" ||
        !Number.isSafeInteger(value.id) ||
        !Number.isSafeInteger(value.tokenVersion)) {
      return res.status(401).json({ message: "Inicia sesión nuevamente" });
    }
    decoded = value;
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, tokenVersion: true, role: true },
    });
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "La sesión venció. Inicia sesión nuevamente" });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      tokenVersion: user.tokenVersion,
    };
  } catch {
    return res.status(503).json({ message: "No se pudo comprobar la sesión" });
  }
  next();
}
