import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getBackgroundTrackId } from "@/lib/config";
import { getTrackById, getTrackFilePath } from "@/lib/tracks";

export const dynamic = "force-dynamic";

/**
 * Sirve el audio de banda sonora sin autenticación.
 * Solo sirve el track configurado en TEMAZO_BACKGROUND_TRACK_ID;
 * cualquier otro ID devuelve 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> }
): Promise<NextResponse> {
  const { trackId: rawId } = await params;
  const trackId = Number(rawId);

  const configured = getBackgroundTrackId();
  if (!configured || configured !== trackId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const track = getTrackById(trackId);
  if (!track) {
    return new NextResponse("Not found", { status: 404 });
  }

  let filePath: string;
  try {
    filePath = getTrackFilePath(track.group_id, track.stored_filename);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const size = stat.size;

  const baseHeaders: Record<string, string> = {
    "Content-Type": track.mime_type || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  };

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
