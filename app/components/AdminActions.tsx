"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGroup,
  leaveGroup,
  regenerateInviteCode,
  removeMember,
} from "@/actions/groups";

interface ConfirmProps {
  children: React.ReactNode;
  confirmMessage: string;
  onConfirm: () => Promise<{ ok?: boolean; error?: string }>;
  variant?: "danger" | "ghost";
  className?: string;
}

function ConfirmButton({
  children,
  confirmMessage,
  onConfirm,
  variant = "danger",
  className = "",
}: ConfirmProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error ?? "No se pudo completar.");
        return;
      }
      router.refresh();
    });
  }

  const base =
    variant === "danger"
      ? "rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
      : "btn-ghost px-4 py-1.5 text-xs";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={`${base} transition disabled:opacity-50 ${className}`}
      >
        {children}
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}

export function RegenerateCodeButton({ groupId }: { groupId: number }) {
  return (
    <ConfirmButton
      confirmMessage="¿Regenerar el código de invitación? El código anterior dejará de funcionar."
      onConfirm={() => regenerateInviteCode(groupId)}
      variant="ghost"
    >
      Regenerar código
    </ConfirmButton>
  );
}

export function DeleteGroupButton({ groupId }: { groupId: number }) {
  return (
    <ConfirmButton
      confirmMessage="¿Eliminar el grupo completo? Se borrarán todas las canciones y votos. Esta acción no se puede deshacer."
      onConfirm={() => deleteGroup(groupId)}
    >
      Eliminar grupo
    </ConfirmButton>
  );
}

export function LeaveGroupButton({ groupId }: { groupId: number }) {
  return (
    <ConfirmButton
      confirmMessage="¿Salir del grupo? Tus votos se eliminarán."
      onConfirm={() => leaveGroup(groupId)}
      variant="ghost"
    >
      Salir del grupo
    </ConfirmButton>
  );
}

export function RemoveMemberButton({
  groupId,
  memberId,
  memberName,
}: {
  groupId: number;
  memberId: number;
  memberName: string;
}) {
  return (
    <ConfirmButton
      confirmMessage={`¿Quitar a ${memberName} del grupo? Sus votos se eliminarán.`}
      onConfirm={() => removeMember(groupId, memberId)}
    >
      Quitar
    </ConfirmButton>
  );
}
