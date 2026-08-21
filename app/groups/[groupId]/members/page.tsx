import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroupForUser, getGroupMembers } from "@/lib/groups";
import {
  DeleteGroupButton,
  LeaveGroupButton,
  RemoveMemberButton,
} from "@/components/AdminActions";
import { RenameMemberForm } from "@/components/RenameMemberForm";
import { AddMemberForm } from "@/components/AddMemberForm";

export default async function GroupMembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const gid = Number(groupId);

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const group = getGroupForUser(gid, user.id);
  if (!group) return null;

  const members = getGroupMembers(gid);

  return (
    <section>
      <h2 className="mb-4 text-2xl font-black text-neutral-100">INTEGRANTES</h2>

      {group.is_admin && (
        <div className="mb-4">
          <AddMemberForm groupId={gid} />
        </div>
      )}

      {members.length === 0 ? (
        <p className="card text-center text-neutral-400">
          Todavía no hay integrantes agregados. Usá &ldquo;Agregar integrante&rdquo;
          para sumar personas al grupo.
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="card flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-black text-white">
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <RenameMemberForm
                    groupId={gid}
                    memberId={member.user_id}
                    name={member.name}
                    canEdit={group.is_admin || member.user_id === user.id}
                  />
                </div>
              </div>

              {group.is_admin && member.user_id !== user.id && (
                <RemoveMemberButton
                  groupId={gid}
                  memberId={member.user_id}
                  memberName={member.name}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 border-t border-white/10 pt-6">
        {group.is_admin ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4">
            <div>
              <p className="font-bold text-rose-300">Zona peligrosa</p>
              <p className="text-sm text-neutral-400">
                Eliminá el grupo y todo su contenido.
              </p>
            </div>
            <DeleteGroupButton groupId={gid} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-sm text-neutral-400">
              ¿Querés salir de este grupo?
            </p>
            <LeaveGroupButton groupId={gid} />
          </div>
        )}
      </div>
    </section>
  );
}
