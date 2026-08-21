"use client";

import { useActionState } from "react";
import { login } from "@/actions/users";
import type { FormState } from "@/lib/result";

const initialState: FormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-3">
      <div>
        <label htmlFor="name" className="label">
          ¿Cómo te llamás?
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={60}
          autoComplete="nickname"
          placeholder="Por ejemplo: Nico"
          className="input"
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
