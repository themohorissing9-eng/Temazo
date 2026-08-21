"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameMember } from "@/actions/groups";

interface RenameMemberFormProps {
  groupId: number;
  memberId: number;
  name: string;
  canEdit: boolean;
}

export function RenameMemberForm({
  groupId,
  memberId,
  name,
  canEdit,
}: RenameMemberFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setValue(name);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    if (trimmed.length > 80) {
      setError("El nombre es demasiado largo (máximo 80 caracteres).");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await renameMember(groupId, memberId, trimmed);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar el nombre.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!canEdit) {
    return <p className="font-semibold text-neutral-100">{name}</p>;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          maxLength={80}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="w-48 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white transition hover:from-orange-400 hover:to-orange-500 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <p className="text-xs text-neutral-500">
          Nombre dentro de este grupo. No cambia su cuenta de login.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="font-semibold text-neutral-100">{name}</p>
      <button
        type="button"
        onClick={startEdit}
        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-neutral-400 transition hover:border-orange-400/40 hover:text-orange-300"
      >
        Editar
      </button>
    </div>
  );
}
