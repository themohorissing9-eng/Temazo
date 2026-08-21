"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clearSession, setSession } from "@/lib/auth";
import type { FormState } from "@/lib/result";

export async function login(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Escribí tu nombre para empezar." };
  }
  if (name.length > 60) {
    return { error: "El nombre es demasiado largo (máximo 60 caracteres)." };
  }

  try {
    const existing = db
      .prepare("SELECT id FROM users WHERE lower(name) = lower(?)")
      .get(name) as { id: number } | undefined;

    let userId: number;
    if (existing) {
      userId = existing.id;
    } else {
      const result = db
        .prepare("INSERT INTO users (name) VALUES (?)")
        .run(name);
      userId = Number(result.lastInsertRowid);
    }

    await setSession(userId);
    revalidatePath("/");
  } catch (err) {
    console.error("[login]", err);
    return { error: "No pudimos iniciar la sesión. Probá de nuevo." };
  }

  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSession();
  revalidatePath("/");
  redirect("/");
}
