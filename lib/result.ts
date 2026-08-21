export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Estado devuelto por un form con useActionState. */
export interface FormState {
  ok?: boolean;
  error?: string;
}
