"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTrack } from "@/actions/tracks";

export function DeleteTrackButton({ trackId }: { trackId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm("¿Seguro que querés eliminar esta canción?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTrack(trackId);
      if (!result.ok) {
        setError(result.error ?? "No se pudo eliminar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="rounded-full border border-rose-500/30 px-3 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
      >
        {pending ? "Eliminando…" : "Eliminar"}
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
