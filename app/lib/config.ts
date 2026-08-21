/**
 * Configuración general de TEMAZO.
 *
 * Lee variables de entorno de forma perezosa (solo en el servidor).
 */

/** ID del track que se reproduce como banda sonora de fondo. Null = desactivado. */
export function getBackgroundTrackId(): number | null {
  const raw = process.env.TEMAZO_BACKGROUND_TRACK_ID;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
