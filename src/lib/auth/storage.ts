import type { Sesion } from "@/lib/auth/types";

const STORAGE_KEY = "erp.sesion.v1";

/**
 * Perfil y permisos no son secretos (el backend sigue siendo la autoridad),
 * así que se cachean en el navegador para reconstruir el menú tras un reload.
 * Los tokens NUNCA se guardan aquí: viven en cookies HttpOnly.
 */
export function leerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Sesion;
    if (!parsed || !Array.isArray(parsed.permisos)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}

export function limpiarSesion() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function nombreCompleto(sesion: Sesion | null) {
  const perfil = sesion?.perfil;
  if (!perfil) return sesion?.nombreUsuario ?? "Usuario";

  const nombre = [perfil.nombre, perfil.apellidoPaterno, perfil.apellidoMaterno]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nombre || sesion?.nombreUsuario || "Usuario";
}

export function iniciales(sesion: Sesion | null) {
  const nombre = nombreCompleto(sesion);
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "US";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
