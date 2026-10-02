import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Response, Request } from "express";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

const SCRYPT_PREFIX = "scrypt";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, encoded: string | null): boolean {
  if (!encoded) return false;
  const [prefix, salt, storedKey] = encoded.split("$");
  if (prefix !== SCRYPT_PREFIX || !salt || !storedKey) return false;
  try {
    const derivedKey = scryptSync(password, salt, 64);
    const storedBuffer = Buffer.from(storedKey, "hex");
    return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
  } catch {
    return false;
  }
}

export async function setApplicationSession(req: Request, res: Response, user: User) {
  const token = await sdk.createSessionToken(user.openId, {
    name: user.name,
    expiresInMs: ONE_YEAR_MS,
  });
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
}

export function clearApplicationSession(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
