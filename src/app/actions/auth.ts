"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  setAdminCookie,
  clearAdminCookie,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function login(input: { email: string; password: string }) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const session = await authenticateAdmin(
    parsed.data.email,
    parsed.data.password
  );
  if (!session) {
    return { ok: false as const, error: "Invalid email or password" };
  }

  await setAdminCookie(session);
  return { ok: true as const };
}

export async function logout() {
  await clearAdminCookie();
  redirect("/admin/login");
}
