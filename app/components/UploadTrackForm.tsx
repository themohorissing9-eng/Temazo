"use client";

import { useActionState, useState } from "react";
import { uploadTrack } from "@/actions/tracks";
import type { FormState } from "@/lib/result";

const initialState: FormState = {};

interface UploadTrackFormProps {
  groupId: number;
  maxUploadMb: number;
  maxVideoMb: number;
  allowedExts: string[];
  videoExts: string[];
  ffmpegOk: boolean;
}

export function UploadTrackForm({
  groupId,
  maxUploadMb,
  maxVideoMb,
  allowedExts,
  videoExts,
  ffmpegOk,
}: UploadTrackFormProps) {
  const [state, formAction, pending] = useActionState(uploadTrack, initialState);
  const [clientError, setClientError] = useState<string | null>(null);

  function validateFile(file: File | null | undefined) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (allowedExts.includes(ext)) {
      if (file.size > maxUploadMb * 1024 * 1024) {
        setClientError(
          `El audio supera el tamaño máximo de ${maxUploadMb} MB.`
        );
        return;
      }
    } else if (videoExts.includes(ext)) {
      if (file.size > maxVideoMb * 1024 * 1024) {
        setClientError(
          `El video supera el tamaño máximo de ${maxVideoMb} MB.`
        );
        return;
      }
    } else {
      setClientError(
        `El formato "${ext || "desconocido"}" no está permitido. Usá audio: ${allowedExts
          .map((e) => e.toUpperCase())
          .join(", ")} o video: ${videoExts.map((e) => e.toUpperCase()).join(", ")}.`
      );
      return;
    }
    setClientError(null);
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      <div>
        <label htmlFor="title" className="label">
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          placeholder="Por ejemplo: La tormenta"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="file" className="label">
          Archivo de audio o video
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept={[...allowedExts, ...videoExts].map((e) => `.${e}`).join(",")}
          onChange={(e) => validateFile(e.target.files?.[0])}
          className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-orange-500 file:to-orange-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:from-orange-400 hover:file:to-orange-500"
        />
        <p className="mt-2 text-xs text-neutral-500">
          Audio: {allowedExts.map((e) => e.toUpperCase()).join(", ")} (máx.{" "}
          {maxUploadMb} MB) · Video: {videoExts.map((e) => e.toUpperCase()).join(", ")}{" "}
          (máx. {maxVideoMb} MB)
        </p>
      </div>

      {(clientError || state.error) && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {clientError ?? state.error}
        </p>
      )}

      {!ffmpegOk && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          FFmpeg no está instalado: la duración se calcula de forma aproximada
          (solo para audio) y no se realiza el análisis completo. La
          reproducción funciona igual.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Subiendo…" : "Subir"}
      </button>
    </form>
  );
}
