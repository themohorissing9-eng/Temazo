"use client";

import { useActionState } from "react";
import { addMember } from "@/actions/groups";
import type { FormState } from "@/lib/result";

const initialState: FormState = {};

export function AddMemberForm({ groupId }: { groupId: number }) {
  const [state, formAction, pending] = useActionState(addMember, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <p className="font-bold text-neutral-100">Agregar integrante</p>
      <div className="mt-2 flex flex-wrap items-start gap-2">
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          placeholder="Nombre de la persona"
          className="input max-w-xs"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Agregando…" : "Agregar"}
        </button>
      </div>
      {state.error && (
        <p className="mt-2 text-sm text-rose-300">{state.error}</p>
      )}
    </form>
  );
}
