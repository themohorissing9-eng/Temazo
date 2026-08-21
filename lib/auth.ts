import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db.ts";

export const SESSION_COOKIE = "temazo_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días
const COOKIE_VERSION = "v1";

export interface User {
  id: number;
  name: string;
  created_at: string;
}

declare global {
  // Permitido para cachear la clave de sesión por proceso cuando no hay
  // variable de entorno. Tipo definido acá para no usar `any`.
  var __temazoSessionSecret: string | undefined;
}

function getSecret(): string {
  const envSecret = process.env.TEMAZO_SESSION_SECRET;
  if (envSecret && envSecret.trim().length > 0) return envSecret;

  if (!globalThis.__temazoSessionSecret) {
    globalThis.__temazoSessionSecret = randomBytes(32).toString("hex");
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[TEMAZO] TEMAZO_SESSION_SECRET no está definida. Se genera una clave " +
          "aleatoria por proceso: las sesiones se invalidarán al reiniciar."
      );
    }
  }
  return globalThis.__temazoSessionSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function signSession(userId: number): string {
  const payload = `${COOKIE_VERSION}.${userId}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySession(value: string | undefined): number | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [version, userIdStr, signature] = parts;
  if (version !== COOKIE_VERSION) return null;
  const userId = Number(userIdStr);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!safeEqual(signature, sign(`${version}.${userIdStr}`))) return null;
  return userId;
}

/** Lee el usuario autenticado desde la cookie. Devuelve null si no hay sesión. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = verifySession(value);
  if (!userId) return null;
  const user = db
    .prepare("SELECT id, name, created_at FROM users WHERE id = ?")
    .get(userId) as User | undefined;
  return user ?? null;
}

/** Lanza un error si no hay usuario autenticado. Usar dentro de Server Actions. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No hay sesión activa.");
  return user;
}

/** Establece la cookie de sesión. Solo válido en Server Actions / Route Handlers. */
export async function setSession(userId: number): Promise<void> {
  const cookieStore = await cookies();
  // La cookie queda sin `Secure` por defecto porque TEMAZO es una app local
  // que normalmente se sirve por HTTP (dev o LAN). Detrás de HTTPS se activa
  // con TEMAZO_COOKIE_SECURE=true.
  cookieStore.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.TEMAZO_COOKIE_SECURE === "true",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

/** Elimina la cookie de sesión (salir de la cuenta). */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}
