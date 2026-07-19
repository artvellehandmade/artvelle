"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { sendContactEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(5, "Please write a short message"),
});

export type ContactInput = z.input<typeof schema>;

export async function submitContact(input: ContactInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  await prisma.message.create({ data });

  try {
    const settings = await getSettings();
    await sendContactEmail(settings, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    });
  } catch (err) {
    console.error("[contact] email failed:", err);
  }

  return { ok: true as const };
}
