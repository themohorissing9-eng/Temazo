"use client";

import { useActionState } from "react";
import { addReview } from "@/actions/reviews";
import type { FormState } from "@/lib/result";

const initialState: FormState = {};

export function AddReviewForm({ trackId }: { trackId: number }) {
  const [state, formAction, pending] = useActionState(addReview, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
    >
      <input type="hidden" name="trackId" value={trackId} />
      <p className="font-bold text-neutral-100">Dejá tu reseña</p>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="name" className="label">
            Tu nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="Por ejemplo: Nico"
            className="input max-w-xs"
          />
        </div>
        <div>
          <label htmlFor="body" className="label">
            ¿Qué opinás de esta canción?
          </label>
          <textarea
            id="body"
            name="body"
            required
            maxLength={500}
            rows={4}
            placeholder="Escribí tu reseña…"
            className="input"
          />
        </div>
      </div>
      {state.error && <p className="mt-2 text-sm text-rose-300">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary mt-3 w-full">
        {pending ? "Publicando…" : "Publicar reseña"}
      </button>
    </form>
  );
}
