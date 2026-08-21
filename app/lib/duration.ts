/**
 * Parser liviano de duración para MP3, WAV, OGG y M4A.
 * Se usa como respaldo cuando ffprobe no está disponible.
 * Nunca lanza: devuelve null si no puede determinar la duración.
 */

function readU32LE(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

function readU32BE(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset);
}

/** Tiempo en segundos o null. */
export type DurationResult = number | null;

export function parseDuration(buf: Buffer, ext: string): DurationResult {
  if (buf.length < 12) return null;
  try {
    switch (ext) {
      case "mp3":
        return parseMp3(buf);
      case "wav":
        return parseWav(buf);
      case "ogg":
        return parseOgg(buf);
      case "m4a":
        return parseM4a(buf);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** WAV: dataSize / byteRate. */
function parseWav(buf: Buffer): DurationResult {
  if (buf.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buf.toString("ascii", 8, 12) !== "WAVE") return null;

  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = readU32LE(buf, offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      if (body + 16 > buf.length) return null;
      byteRate = readU32LE(buf, body + 8);
    } else if (id === "data") {
      dataSize = size;
    }
    offset = body + size + (size % 2);
  }

  if (byteRate <= 0) return null;
  return dataSize / byteRate;
}

// ---------------------------------------------------------------------------
// MP3
// ---------------------------------------------------------------------------

interface MpegHeader {
  bitrateKbps: number;
  sampleRate: number;
  samplesPerFrame: number;
  frameLen: number;
}

const BITRATES_V1L3 = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const BITRATES_V2L3 = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
];
const BITRATES_V1L2 = [
  0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0,
];
const BITRATES_V2L2 = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
];
const BITRATES_L1 = [
  0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0,
];
const SAMPLE_RATES_V1 = [44100, 48000, 32000];
const SAMPLE_RATES_V2 = [22050, 24000, 16000];
const SAMPLE_RATES_V25 = [11025, 12000, 8000];

function parseMpegHeader(offset: number, buf: Buffer): MpegHeader | null {
  if (offset + 4 > buf.length) return null;
  if (buf[offset] !== 0xff || (buf[offset + 1] & 0xe0) !== 0xe0) return null;

  const b1 = buf[offset + 1];
  const b2 = buf[offset + 2];

  const versionBits = (b1 >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const layerBits = (b1 >> 1) & 0x03; // 1=LayerIII, 2=LayerII, 3=LayerI
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;

  if (versionBits === 1) return null; // reservado
  if (layerBits === 0) return null; // reservado
  if (sampleRateIndex === 3) return null; // reservado

  let bitrateKbps: number;
  let sampleRate: number;
  let samplesPerFrame: number;

  if (layerBits === 3) {
    bitrateKbps = BITRATES_L1[bitrateIndex] ?? 0;
    sampleRate =
      versionBits === 3
        ? SAMPLE_RATES_V1[sampleRateIndex] ?? 0
        : versionBits === 2
          ? SAMPLE_RATES_V2[sampleRateIndex] ?? 0
          : SAMPLE_RATES_V25[sampleRateIndex] ?? 0;
    samplesPerFrame = 384;
  } else {
    const mpeg1 = versionBits === 3;
    if (layerBits === 1) {
      bitrateKbps = mpeg1 ? BITRATES_V1L3[bitrateIndex] ?? 0 : BITRATES_V2L3[bitrateIndex] ?? 0;
      samplesPerFrame = mpeg1 ? 1152 : 576;
    } else {
      bitrateKbps = mpeg1 ? BITRATES_V1L2[bitrateIndex] ?? 0 : BITRATES_V2L2[bitrateIndex] ?? 0;
      samplesPerFrame = mpeg1 ? 1152 : 576;
    }
    sampleRate = mpeg1
      ? SAMPLE_RATES_V1[sampleRateIndex] ?? 0
      : versionBits === 2
        ? SAMPLE_RATES_V2[sampleRateIndex] ?? 0
        : SAMPLE_RATES_V25[sampleRateIndex] ?? 0;
  }

  if (bitrateKbps <= 0 || sampleRate <= 0) return null;

  let frameLen: number;
  if (layerBits === 3) {
    frameLen = ((12 * bitrateKbps * 1000) / sampleRate + padding) * 4;
  } else {
    frameLen = (144 * bitrateKbps * 1000) / sampleRate + padding;
  }

  return { bitrateKbps, sampleRate, samplesPerFrame, frameLen };
}

function id3v2Size(buf: Buffer): number {
  if (buf.length < 10) return 0;
  if (buf.toString("ascii", 0, 3) !== "ID3") return 0;
  const flags = buf[5];
  const size =
    ((buf[6] & 0x7f) << 21) |
    ((buf[7] & 0x7f) << 14) |
    ((buf[8] & 0x7f) << 7) |
    (buf[9] & 0x7f);
  const footer = flags & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

function parseXing(buf: Buffer, headerStart: number, header: MpegHeader): DurationResult {
  // El tag Xing/Info está al inicio del primer frame.
  const sideInfoSize = header.sampleRate >= 32000 ? 32 : 17;
  const possibleOffsets = [headerStart + 4, headerStart + 4 + sideInfoSize];
  for (const off of possibleOffsets) {
    if (off + 16 > buf.length) continue;
    const tag = buf.toString("ascii", off, off + 4);
    if (tag !== "Xing" && tag !== "Info") continue;
    const flags = readU32BE(buf, off + 4);
    if (flags & 0x0001) {
      // frame count presente
      const frames = readU32BE(buf, off + 8);
      if (frames > 0) {
        return frames * (header.samplesPerFrame / header.sampleRate);
      }
    }
  }
  return null;
}

function parseMp3(buf: Buffer): DurationResult {
  const dataStart = id3v2Size(buf);
  const firstFrameOffset = findFrameOffset(buf, dataStart);
  if (firstFrameOffset === null) return null;

  const header = parseMpegHeader(firstFrameOffset, buf);
  if (!header) return null;

  const xing = parseXing(buf, firstFrameOffset, header);
  if (xing !== null) return xing;

  const audioBytes = buf.length - firstFrameOffset;
  if (header.bitrateKbps <= 0) return null;
  return (audioBytes * 8) / (header.bitrateKbps * 1000);
}

function findFrameOffset(buf: Buffer, start: number): number | null {
  for (let i = start; i + 4 <= buf.length; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const header = parseMpegHeader(i, buf);
      if (header) return i;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// OGG (Vorbis / Opus)
// ---------------------------------------------------------------------------

function parseOgg(buf: Buffer): DurationResult {
  if (buf.toString("ascii", 0, 4) !== "OggS") return null;

  // Identificación del códec en la primera página.
  const firstPageBody = offsetAfterPageHeader(buf, 0);
  if (firstPageBody === null) return null;

  let sampleRate: number | null = null;
  if (buf.toString("ascii", firstPageBody, firstPageBody + 7) === "\u0001vorbis") {
    if (firstPageBody + 14 <= buf.length) {
      sampleRate = readU32LE(buf, firstPageBody + 11);
    }
  } else if (buf.toString("ascii", firstPageBody, firstPageBody + 8) === "OpusHead") {
    // El granule de Opus siempre se expresa a 48 kHz.
    sampleRate = 48000;
  }

  if (sampleRate === null) return null;

  // Granule position de la última página.
  const lastGranule = findLastGranule(buf);
  if (lastGranule === null || lastGranule < 0) return null;
  return lastGranule / sampleRate;
}

function offsetAfterPageHeader(buf: Buffer, pageStart: number): number | null {
  if (pageStart + 27 > buf.length) return null;
  const segments = buf[pageStart + 26];
  const tableStart = pageStart + 27;
  if (tableStart + segments > buf.length) return null;
  return tableStart + segments;
}

function findLastGranule(buf: Buffer): number | null {
  // Busca la última página Ogg en los últimos 128 KB del archivo.
  const window = Math.min(buf.length, 128 * 1024);
  const start = buf.length - window;
  for (let i = buf.length - 27; i >= start; i--) {
    if (
      buf[i] === 0x4f && // 'O'
      buf[i + 1] === 0x67 && // 'g'
      buf[i + 2] === 0x67 && // 'g'
      buf[i + 3] === 0x53 // 'S'
    ) {
      // Evitar falsos positivos dentro de páginas: verificar checksum es costoso,
      // pero validamos que i sea límite entre páginas usando la tabla de segmentos
      // de la página anterior es complejo. Aceptamos el primer sync desde el final.
      return Number(buf.readBigUInt64LE(i + 6));
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// M4A (MP4 container)
// ---------------------------------------------------------------------------

function parseM4a(buf: Buffer): DurationResult {
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = readU32BE(buf, offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const body = offset + 8;

    if (type === "moov") {
      const mvhd = findMvhd(buf, body, size > 0 ? size : buf.length - body);
      if (mvhd) return mvhd;
    }

    if (size === 0) break;
    if (size === 1) {
      // box de 64 bits
      if (offset + 16 > buf.length) break;
      offset += 16;
    } else {
      offset += size;
    }
  }
  return null;
}

function findMvhd(buf: Buffer, start: number, maxLen: number): DurationResult {
  let offset = start;
  const end = Math.min(start + maxLen, buf.length);
  while (offset + 8 <= end) {
    const size = readU32BE(buf, offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const body = offset + 8;

    if (type === "mvhd" && body + 16 <= end) {
      const version = buf[body];
      if (version === 0) {
        if (body + 20 > end) return null;
        const timescale = readU32BE(buf, body + 12);
        const duration = readU32BE(buf, body + 16);
        if (timescale === 0) return null;
        return duration / timescale;
      }
      if (version === 1) {
        if (body + 28 > end) return null;
        const timescale = readU32BE(buf, body + 20);
        const duration = Number(buf.readBigUInt64BE(body + 24));
        if (timescale === 0) return null;
        return duration / timescale;
      }
    }

    if (size === 0) break;
    offset += size > 0 ? size : 8;
  }
  return null;
}
