import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

export interface FfprobeResult {
  duration_seconds: number | null;
  format_name: string | null;
}

let probeStatus: "unknown" | "available" | "missing" = "unknown";

/** Comprueba una vez por proceso si ffprobe y ffmpeg están instalados. */
export function ffmpegAvailable(): boolean {
  if (probeStatus === "unknown") {
    probeStatus = hasBinary("ffprobe") && hasBinary("ffmpeg") ? "available" : "missing";
  }
  return probeStatus === "available";
}

function hasBinary(name: string): boolean {
  const paths = (process.env.PATH ?? "").split(";").filter(Boolean);
  const extensions =
    process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const dir of paths) {
    for (const ext of extensions) {
      const candidate = path.join(/*turbopackIgnore: true*/ dir, `${name}${ext}`);
      try {
        if (statSync(/*turbopackIgnore: true*/ candidate).isFile()) return true;
      } catch {
        // seguir buscando en la siguiente ubicación
      }
    }
  }
  return false;
}

/**
 * Obtiene la duración y el formato de un archivo de audio usando ffprobe.
 * Devuelve null si ffprobe no está disponible o falla.
 */
export async function probeWithFfmpeg(
  filePath: string
): Promise<FfprobeResult | null> {
  if (!ffmpegAvailable()) return null;
  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:format=format_name",
        "-of",
        "json",
        filePath,
      ],
      { timeout: 15000, windowsHide: true },
      (error, stdout) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as {
            format?: { duration?: string; format_name?: string };
          };
          const format = parsed?.format;
          const duration = format?.duration
            ? Number.parseFloat(format.duration)
            : null;
          resolve({
            duration_seconds:
              duration !== null && Number.isFinite(duration) ? duration : null,
            format_name: format?.format_name ?? null,
          });
        } catch {
          resolve(null);
        }
      }
    );
  });
}
