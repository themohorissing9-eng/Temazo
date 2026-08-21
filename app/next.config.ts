import type { NextConfig } from "next";

// El límite por defecto de Server Actions es 1 MB. Como TEMAZO permite subir
// archivos de hasta TEMAZO_MAX_UPLOAD_MB (audio, 50 MB por defecto) o
// TEMAZO_MAX_VIDEO_MB (video, 70 MB por defecto), hay que subir este límite o
// Next rechaza la subida con 413 antes de llegar a la action.
// Se agregan 2 MB de margen para el overhead de multipart/form-data.
const maxUploadMb = (() => {
  const raw = process.env.TEMAZO_MAX_UPLOAD_MB;
  const mb = raw ? Number(raw) : 50;
  return Number.isFinite(mb) && mb > 0 ? mb : 50;
})();

const maxVideoMb = (() => {
  const raw = process.env.TEMAZO_MAX_VIDEO_MB;
  const mb = raw ? Number(raw) : 70;
  return Number.isFinite(mb) && mb > 0 ? mb : 70;
})();

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: `${Math.max(maxUploadMb, maxVideoMb) + 2}mb`,
    },
  },
};

export default nextConfig;
