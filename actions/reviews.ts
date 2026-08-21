"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/result";

const NAME_MAX = 60;
const BODY_MAX = 500;

export async function addReview(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const trackId = Number(formData.get("trackId"));
  if (!Number.isInteger(trackId) || trackId <= 0) {
    return { error: "Canción inválida." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Escribí tu nombre." };
  if (name.length > NAME_MAX) {
    return { error: `El nombre no puede superar los ${NAME_MAX} caracteres.` };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Escribí tu reseña." };
  if (body.length > BODY_MAX) {
    return { error: `La reseña no puede superar los ${BODY_MAX} caracteres.` };
  }

  try {
    const track = db
      .prepare(
        `
        SELECT t.id FROM tracks t
        INNER JOIN groups g ON g.id = t.group_id
        WHERE t.id = ? AND COALESCE(g.hidden_from_ranking, 0) = 0
        `
      )
      .get(trackId);
    if (!track) return { error: "Esa canción no está en el ranking." };

    db.prepare("INSERT INTO reviews (track_id, name, body) VALUES (?, ?, ?)").run(
      trackId,
      name,
      body
    );

    revalidatePath("/resenas");
    return { ok: true };
  } catch (err) {
    console.error("[addReview]", err);
    return { error: "No pudimos publicar tu reseña. Probá de nuevo." };
  }
}
