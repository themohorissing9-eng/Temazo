"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFileSync } from "node:fs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getGroupById, isMemberOfGroup } from "@/lib/groups";
import {
  ensureGroupUploadDir,
  extensionFromFilename,
  getMaxUploadBytes,
  getMaxUploadMb,
  getMaxVideoBytes,
  getMaxVideoMb,
  getTrackById,
  getTrackFilePath,
  inspectAudioMagic,
  inspectVideoMagic,
  isAllowedMimeForExt,
  isAllowedVideoMimeForExt,
  videoExtensionFromFilename,
  deleteTrackFile,
} from "@/lib/tracks";
import { probeWithFfmpeg, ffmpegAvailable } from "@/lib/ffmpeg";
import { parseDuration } from "@/lib/duration";
import type { FormState } from "@/lib/result";
import type { AllowedExtension, AllowedVideoExtension } from "@/lib/tracks";

export async function uploadTrack(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const groupId = Number(formData.get("groupId"));
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return { error: "Grupo inválido." };
  }
  if (!isMemberOfGroup(user.id, groupId)) {
    return { error: "No pertenecés a este grupo." };
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { error: "Escribí el título." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí un archivo de audio o video." };
  }

  const audioExt: AllowedExtension | null = extensionFromFilename(file.name);
  const videoExt: AllowedVideoExtension | null = videoExtensionFromFilename(
    file.name
  );

  if (!audioExt && !videoExt) {
    return {
      error:
        "El formato no está permitido. Usá audio (MP3, WAV, OGG, M4A) o video (MP4, WEBM, MOV).",
    };
  }

  if (audioExt) {
    if (file.size > getMaxUploadBytes()) {
      return {
        error: `El archivo de audio supera el tamaño máximo permitido (${getMaxUploadMb()} MB).`,
      };
    }
    if (!isAllowedMimeForExt(audioExt, file.type)) {
      return { error: "El formato de audio no está permitido." };
    }
  } else if (videoExt) {
    if (file.size > getMaxVideoBytes()) {
      return {
        error: `El archivo de video supera el tamaño máximo permitido (${getMaxVideoMb()} MB).`,
      };
    }
    if (!isAllowedVideoMimeForExt(videoExt, file.type)) {
      return { error: "El formato de video no está permitido." };
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = audioExt ?? videoExt!;

  if (audioExt) {
    const magic = inspectAudioMagic(buf, audioExt);
    if (!magic.ok) return { error: magic.error ?? "Archivo inválido." };
  } else {
    const magic = inspectVideoMagic(buf, videoExt!);
    if (!magic.ok) return { error: magic.error ?? "Archivo inválido." };
  }

  let trackId: number;
  try {
    const result = db
      .prepare(
        `INSERT INTO tracks
           (group_id, user_id, title, original_filename, stored_filename, mime_type, file_size, status)
         VALUES (?, ?, ?, ?, '', ?, ?, 'processing')`
      )
      .run(groupId, user.id, title, file.name, file.type || "application/octet-stream", file.size);
    trackId = Number(result.lastInsertRowid);
  } catch (err) {
    console.error("[uploadTrack] insert", err);
    return { error: "No pudimos subir el archivo." };
  }

  const storedFilename = `${trackId}.${ext}`;

  try {
    ensureGroupUploadDir(groupId);
    const filePath = getTrackFilePath(groupId, storedFilename);
    writeFileSync(filePath, buf);

    let duration: number | null = null;
    if (ffmpegAvailable()) {
      const probe = await probeWithFfmpeg(filePath);
      duration = probe?.duration_seconds ?? null;
    }
    if (duration === null || duration <= 0) {
      duration = parseDuration(buf, ext);
    }

    db.prepare(
      `UPDATE tracks
       SET stored_filename = ?, duration_seconds = ?, status = 'ready'
       WHERE id = ?`
    ).run(storedFilename, duration && duration > 0 ? duration : null, trackId);
  } catch (err) {
    console.error("[uploadTrack] file", err);
    db.prepare("DELETE FROM tracks WHERE id = ?").run(trackId);
    return { error: "No pudimos subir el archivo. Intentá de nuevo." };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function deleteTrack(trackId: number): Promise<FormState> {
  const user = await requireUser();
  const track = getTrackById(trackId);
  if (!track) return { error: "La canción no existe." };

  const group = getGroupById(track.group_id);
  if (!group) return { error: "El grupo no existe." };

  const isOwner = track.user_id === user.id;
  const isAdmin = group.created_by === user.id;
  if (!isOwner && !isAdmin) {
    return { error: "No tenés permiso para eliminar esta canción." };
  }

  try {
    db.prepare("DELETE FROM tracks WHERE id = ?").run(trackId);
    deleteTrackFile(track.group_id, track.stored_filename);
  } catch (err) {
    console.error("[deleteTrack]", err);
    return { error: "No pudimos eliminar la canción." };
  }

  revalidatePath(`/groups/${track.group_id}`);
  revalidatePath(`/groups/${track.group_id}/ranking`);
  return { ok: true };
}
