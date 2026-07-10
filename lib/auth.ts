import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

export type Role = "owner" | "admin" | "member";

export type Session = {
  userId?: string;
  role: Role;
  name: string;
  email?: string;
  createdAt: number;
};

const COOKIE_NAME = "marketing_digest_session";

function authDisabled() {
  if (process.env.AUTH_DISABLED === "true") return true;
  return false;
}

function bypassSession(): Session {
  return {
    role: "owner",
    name: "本机负责人",
    createdAt: Date.now()
  };
}

function normalizeRole(role: string): Role {
  if (role === "owner" || role === "admin") return role;
  return "member";
}

function getSecret() {
  return process.env.APP_SESSION_SECRET || "development-session-secret";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encodeSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value?: string): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export async function getSession() {
  if (authDisabled()) return bypassSession();

  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(COOKIE_NAME)?.value);
  if (!session?.userId) return null;

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "active") return null;

  return {
    userId: user.id,
    role: normalizeRole(user.role),
    name: user.name,
    email: user.email,
    createdAt: session.createdAt
  } satisfies Session;
}

export async function requireRole(roles: Role[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    redirect("/login");
  }
  return session;
}

export async function setSession(user: { id: string; role: string; name: string; email: string }) {
  if (authDisabled()) return;

  const cookieStore = await cookies();
  const role = normalizeRole(user.role);
  cookieStore.set(COOKIE_NAME, encodeSession({ userId: user.id, role, name: user.name, email: user.email, createdAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearSession() {
  if (authDisabled()) return;

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
