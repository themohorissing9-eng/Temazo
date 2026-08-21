"use client";

import { useActionState } from "react";
import { joinGroup } from "@/actions/groups";
import type { FormState } from "@/lib/result";

const initialState: FormState = {};

export function JoinGroupForm() {
  const [state, formAction, pending] = useActionState(joinGroup, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="invite-code" className="label">
          Código de invitación
        </label>
        <input
          id="invite-code"
          name="code"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="TEMAZO-7K4P2"
          className="input font-mono tracking-wider"
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Ingresando…" : "Unirme a un grupo"}
      </button>
    </form>
  );
}
