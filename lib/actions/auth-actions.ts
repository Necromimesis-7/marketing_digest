"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearSession, requireRole, setSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

function normalizedEmail(formData: FormData) {
  return String(formData.get("email") || "").trim().toLowerCase();
}

function registrationCode() {
  return process.env.REGISTRATION_CODE || (process.env.NODE_ENV === "production" ? "" : "marketingcase");
}

function safeUserRole(value: FormDataEntryValue | null) {
  const role = String(value);
  if (role === "owner" || role === "admin") return role;
  return "member";
}

function safeUserStatus(value: FormDataEntryValue | null) {
  return String(value) === "disabled" ? "disabled" : "active";
}

export async function loginAction(formData: FormData) {
  const email = normalizedEmail(formData);
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "active" || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  await setSession(user);
  redirect(user.role === "owner" || user.role === "admin" ? "/admin/articles" : "/my/articles");
}

export async function registerAction(formData: FormData) {
  const email = normalizedEmail(formData);
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");
  const code = String(formData.get("registrationCode") || "").trim();
  const expectedCode = registrationCode();

  if (!email || !name || password.length < 8) {
    redirect("/register?error=missing");
  }

  if (password !== passwordConfirm) {
    redirect("/register?error=mismatch");
  }

  if (!expectedCode || code !== expectedCode) {
    redirect("/register?error=code");
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect("/register?error=exists");
  }

  const userCount = await db.user.count();
  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: userCount === 0 ? "owner" : "member",
      status: "active"
    }
  });

  await setSession(user);
  redirect(user.role === "owner" || user.role === "admin" ? "/admin/articles" : "/my/articles");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function updateUserAction(formData: FormData) {
  const session = await requireRole(["owner"]);
  const userId = String(formData.get("userId") || "");
  const role = safeUserRole(formData.get("role"));
  const status = safeUserStatus(formData.get("status"));

  if (!userId) {
    redirect("/admin/users?error=missing-user");
  }

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    redirect("/admin/users?error=missing-user");
  }

  const isSelf = session.userId === userId;
  const nextRole = isSelf ? "owner" : role;
  const nextStatus = isSelf ? "active" : status;

  if (!isSelf && targetUser.role === "owner" && (nextRole !== "owner" || nextStatus !== "active")) {
    const activeOwnerCount = await db.user.count({ where: { role: "owner", status: "active" } });
    if (activeOwnerCount <= 1) {
      redirect("/admin/users?error=last-owner");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      role: nextRole,
      status: nextStatus
    }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}
