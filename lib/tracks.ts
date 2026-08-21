import path from "node:path";
import { mkdirSync, statSync, unlinkSync } from "node:fs";
import { db } from "./db.ts";

export const ALLOWED_EXTENSIONS = ["mp3", "wav", "ogg", "m4a"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "webm", "mov"] as const;
export type AllowedVideoExtension = (typeof ALLOWED_VIDEO_EXTENSIONS)[number];

const MIME_BY_EXT: Record<AllowedExtension, string[]> = {
  mp3: ["audio/mpeg", "audio/mp3"],
  wav: ["audio/wav", "audio/x-wav", "audio/wave", "audio/x-pn-wav"],
  ogg: ["audio/ogg", "application/ogg"],
  m4a: ["audio/mp4", "audio/x-m4a", "audio/mp4a-latm"],
};

const VIDEO_MIME_BY_EXT: Record<AllowedVideoExtension, string[]> = {
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mov: ["video/quicktime"],
};

export interface TrackRow {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  duration_seconds: number | null;
  status: string;
  created_at: string;
}

export function getMaxUploadBytes(): number {
  const raw = process.env.TEMAZO_MAX_UPLOAD_MB;
  const mb = raw ? Number(raw) : 50;
  const safe = Number.isFinite(mb) && mb > 0 ? mb : 50;
  return safe * 1024 * 1024;
}

export function getMaxUploadMb(): number {
  return Math.round(getMaxUploadBytes() / (1024 * 1024));
}

export function getMaxVideoBytes(): number {
  const raw = process.env.TEMAZO_MAX_VIDEO_MB;
  const mb = raw ? Number(raw) : 70;
  const safe = Number.isFinite(mb) && mb > 0 ? mb : 70;
  return safe * 1024 * 1024;
}

export function getMaxVideoMb(): number {
  return Math.round(getMaxVideoBytes() / (1024 * 1024));
}

/** Directorio donde se guardan los archivos de audio. */
export function getUploadDir(): string {
  const dir = process.env.TEMAZO_UPLOAD_DIR ?? "uploads";
  return path.isAbsolute(dir) ? dir : path.join(/*turbopackIgnore: true*/ process.cwd(), dir);
}

/** Devuelve la ruta absoluta segura de un archivo almacenado. */
export function getTrackFilePath(groupId: number, storedFilename: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(storedFilename)) {
    throw new Error("Nombre de archivo inválido.");
  }
  return path.join(getUploadDir(), String(groupId), storedFilename);
}

export function getTrackById(trackId: number): TrackRow | null {
  const row = db.prepare("SELECT * FROM tracks WHERE id = ?").get(trackId);
  return (row as TrackRow | undefined) ?? null;
}

export function extensionFromFilename(filename: string): AllowedExtension | null {
  const lower = filename.toLowerCase().split("?")[0];
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = lower.slice(dot + 1) as AllowedExtension;
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : null;
}

export function videoExtensionFromFilename(
  filename: string
): AllowedVideoExtension | null {
  const lower = filename.toLowerCase().split("?")[0];
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = lower.slice(dot + 1) as AllowedVideoExtension;
  return ALLOWED_VIDEO_EXTENSIONS.includes(ext) ? ext : null;
}

export function isAllowedMimeForExt(ext: AllowedExtension, mime: string): boolean {
  return MIME_BY_EXT[ext].includes(mime.toLowerCase());
}

export function isAllowedVideoMimeForExt(
  ext: AllowedVideoExtension,
  mime: string
): boolean {
  return VIDEO_MIME_BY_EXT[ext].includes(mime.toLowerCase());
}

export interface InspectResult {
  ok: boolean;
  error?: string;
}

/** Valida los primeros bytes del archivo contra el formato declarado. */
export function inspectAudioMagic(buf: Buffer, ext: AllowedExtension): InspectResult {
  if (buf.length < 12) {
    return { ok: false, error: "El archivo parece estar vacío o corrupto." };
  }
  switch (ext) {
    case "mp3": {
      const hasId3 = buf.toString("latin1", 0, 3) === "ID3";
      const hasFrameSync = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
      if (!hasId3 && !hasFrameSync) {
        return { ok: false, error: "El archivo no parece un MP3 válido." };
      }
      break;
    }
    case "wav": {
      if (
        buf.toString("latin1", 0, 4) !== "RIFF" ||
        buf.toString("latin1", 8, 12) !== "WAVE"
      ) {
        return { ok: false, error: "El archivo no parece un WAV válido." };
      }
      break;
    }
    case "ogg": {
      if (buf.toString("latin1", 0, 4) !== "OggS") {
        return { ok: false, error: "El archivo no parece un OGG válido." };
      }
      break;
    }
    case "m4a": {
      if (buf.toString("latin1", 4, 8) !== "ftyp") {
        return { ok: false, error: "El archivo no parece un M4A válido." };
      }
      break;
    }
  }
  return { ok: true };
}

/** Valida los primeros bytes del archivo contra el formato de video declarado. */
export function inspectVideoMagic(
  buf: Buffer,
  ext: AllowedVideoExtension
): InspectResult {
  if (buf.length < 12) {
    return { ok: false, error: "El archivo parece estar vacío o corrupto." };
  }
  switch (ext) {
    case "mp4":
    case "mov": {
      if (buf.toString("latin1", 4, 8) !== "ftyp") {
        return {
          ok: false,
          error: "El archivo no parece un video MP4/MOV válido.",
        };
      }
      break;
    }
    case "webm": {
      // Cabecera EBML de Matroska/WebM.
      if (buf.toString("latin1", 0, 4) !== "\x1A\x45\xDF\xA3") {
        return { ok: false, error: "El archivo no parece un WebM válido." };
      }
      break;
    }
  }
  return { ok: true };
}

export function trackFileExists(groupId: number, storedFilename: string): boolean {
  try {
    statSync(getTrackFilePath(groupId, storedFilename)).isFile();
    return true;
  } catch {
    return false;
  }
}

/**
 * Crea el directorio de subidas del grupo (si no existe).
 * Devuelve la ruta absoluta del directorio.
 */
export function ensureGroupUploadDir(groupId: number): string {
  const dir = path.join(getUploadDir(), String(groupId));
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Elimina el archivo físico si existe (sin lanzar errores). */
export function deleteTrackFile(groupId: number, storedFilename: string): void {
  try {
    unlinkSync(getTrackFilePath(groupId, storedFilename));
  } catch {
    // el archivo ya no existe; ignorar
  }
}
