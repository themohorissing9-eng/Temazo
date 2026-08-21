import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { GroupNav } from "@/components/GroupNav";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { RegenerateCodeButton } from "@/components/AdminActions";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const gid = Number(groupId);

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const group = getGroupForUser(gid, user.id);

  if (!group) {
    return (
      <section className="card text-center">
        <h1 className="text-2xl font-black text-rose-300">
          No pertenecés a este grupo
        </h1>
        <p className="mt-2 text-neutral-400">
          Para ver esta información necesitás el código de invitación.
        </p>
        <Link href="/" className="btn-primary mt-5 inline-flex">
          Volver al inicio
        </Link>
      </section>
    );
  }

  return (
    <div>
      <section className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black text-neutral-100">
              {group.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 font-mono text-sm text-orange-200">
                {group.invite_code}
              </span>
              <CopyCodeButton code={group.invite_code} />
              {group.is_admin && <RegenerateCodeButton groupId={group.id} />}
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              {group.member_count}{" "}
              {group.member_count === 1 ? "integrante" : "integrantes"} ·{" "}
              {group.track_count} {group.track_count === 1 ? "canción" : "canciones"}
            </p>
          </div>

          <Link href={`/groups/${group.id}/upload`} className="btn-primary shrink-0">
            + Subir mi música
          </Link>
        </div>

        <GroupNav groupId={group.id} />
      </section>

      {children}
    </div>
  );
}
