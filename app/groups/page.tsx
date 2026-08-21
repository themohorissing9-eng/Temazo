import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/groups";

export default async function MyGroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const groups = getUserGroups(user.id);

  return (
    <section>
      <h1 className="text-3xl font-black text-neutral-100">Mis grupos</h1>
      <p className="mt-2 text-neutral-400">
        Grupos a los que pertenecés. Creá uno nuevo o unite con un código
        desde el inicio.
      </p>

      {groups.length === 0 ? (
        <p className="card mt-6 text-center text-neutral-400">
          No estás en ningún grupo todavía.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="card block transition hover:border-orange-400/40 hover:bg-white/10"
              >
                <p className="font-bold text-neutral-100">{group.name}</p>
                <p className="mt-1 font-mono text-sm text-orange-300">
                  {group.invite_code}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {group.member_count}{" "}
                  {group.member_count === 1 ? "integrante" : "integrantes"} ·{" "}
                  {group.track_count}{" "}
                  {group.track_count === 1 ? "canción" : "canciones"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link href="/" className="btn-ghost">
          ← Crear o unirme a un grupo
        </Link>
      </div>
    </section>
  );
}
