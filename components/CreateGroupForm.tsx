"use client";

import { useActionState } from "react";
import { createGroup } from "@/actions/groups";
import type { FormState } from "@/lib/result";

const initialState: FormState = {};

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(createGroup, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="group-name" className="label">
          Nombre del grupo
        </label>
        <input
          id="group-name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="Por ejemplo: Los del viernes"
          className="input"
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creando…" : "Crear grupo"}
      </button>
    </form>
  );
}
