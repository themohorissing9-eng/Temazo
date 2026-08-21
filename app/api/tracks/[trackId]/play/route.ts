import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMemberOfGroup } from "@/lib/groups";
import { getTrackById } from "@/lib/tracks";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
): Promise<NextResponse> {
  const { trackId: rawId } = await params;
  const trackId = Number(rawId);

  if (!Number.isInteger(trackId) || trackId <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (!isMemberOfGroup(user.id, track.group_id)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  db.prepare("INSERT INTO plays (track_id, user_id) VALUES (?, ?)").run(
    trackId,
    user.id
  );

  return NextResponse.json({ ok: true });
}
