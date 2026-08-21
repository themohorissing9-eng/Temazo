import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMemberOfGroup } from "@/lib/groups";
import { getTrackById, getTrackFilePath } from "@/lib/tracks";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
): Promise<NextResponse> {
  const { trackId: rawId } = await params;
  const trackId = Number(rawId);

  if (!Number.isInteger(trackId) || trackId <= 0) {
    return new NextResponse("Canción inválida", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    return new NextResponse("No encontrada", { status: 404 });
  }

  if (!isMemberOfGroup(user.id, track.group_id)) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  let filePath: string;
  try {
    filePath = getTrackFilePath(track.group_id, track.stored_filename);
  } catch {
    return new NextResponse("No encontrada", { status: 404 });
  }

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return new NextResponse("No encontrada", { status: 404 });
  }

  const size = stat.size;
  const baseHeaders: Record<string, string> = {
    "Content-Type": track.mime_type || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  const range = request.headers.get("range");

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      return new NextResponse("Range inválido", { status: 416 });
    }

    let start = match[1] ? Number.parseInt(match[1], 10) : 0;
    let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;

    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= size) end = size - 1;

    if (start > end || start >= size) {
      return new NextResponse("Range fuera de rango", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end })
    ) as ReadableStream<Uint8Array>;

    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
    });
  }

  const stream = Readable.toWeb(
    createReadStream(filePath)
  ) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}
