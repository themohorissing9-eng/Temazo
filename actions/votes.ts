"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isMemberOfGroup } from "@/lib/groups";
import { getTrackById } from "@/lib/tracks";
import type { ActionResult } from "@/lib/result";

/**
 * Registra o actualiza el voto del usuario actual sobre una canción.
 * Solo pueden votarse canciones de grupos a los que se pertenece.
 * Si ya votó, se actualiza su puntuación.
 */
export async function setVote(
  trackId: number,
  score: number
): Promise<ActionResult<{ groupId: number }>> {
  const user = await requireUser();

  const s = Math.round(Number(score));
  if (!Number.isInteger(s) || s < 1 || s > 10) {
    return { ok: false, error: "La puntuación debe ser entre 1 y 10." };
  }

  const track = getTrackById(trackId);
  if (!track) return { ok: false, error: "La canción no existe." };
  if (!isMemberOfGroup(user.id, track.group_id)) {
    return { ok: false, error: "No pertenecés a este grupo." };
  }

  try {
    db.prepare(
      `INSERT INTO votes (track_id, user_id, score)
       VALUES (?, ?, ?)
       ON CONFLICT(track_id, user_id) DO UPDATE SET
         score = excluded.score,
         updated_at = datetime('now')`
    ).run(trackId, user.id, s);
  } catch (err) {
    console.error("[setVote]", err);
    return { ok: false, error: "No pudimos registrar tu voto." };
  }

  revalidatePath(`/groups/${track.group_id}`);
  revalidatePath(`/groups/${track.group_id}/ranking`);
  return { ok: true, data: { groupId: track.group_id } };
}
