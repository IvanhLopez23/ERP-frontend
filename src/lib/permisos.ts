import type { Accion, PermisoNodo } from "@/lib/auth/types";

export type MenuNodo = PermisoNodo & { childrens?: PermisoNodo[] };

export type MenuGrupo = {
  modulo: string;
  nodos: MenuNodo[];
};

function normalizarRuta(ruta: string) {
  if (!ruta || ruta === "#") return "#";
  const limpia = ruta.split("?")[0].replace(/\/+$/, "");
  return limpia === "" ? "/" : limpia;
}

function buscarExacto(nodos: PermisoNodo[], ruta: string): PermisoNodo | null {
  for (const nodo of nodos) {
    if (normalizarRuta(nodo.ruta) === ruta) return nodo;
    if (nodo.childrens?.length) {
      const encontrado = buscarExacto(nodo.childrens, ruta);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

/**
 * El backend autoriza GET/POST/PUT-PATCH/DELETE como ver/crear/editar/eliminar.
 * Activar y desactivar usan PATCH, por lo que dependen de `editar`.
 */
export function puede(
  permisos: PermisoNodo[],
  esAdministrador: boolean,
  ruta: string,
  accion: Accion = "ver",
): boolean {
  if (esAdministrador) return true;

  const objetivo = normalizarRuta(ruta);
  const exacto = buscarExacto(permisos, objetivo);
  if (exacto) return Boolean(exacto[accion]);

  // Permite que una pantalla hija herede del permiso padre más específico.
  const candidatos = aplanar(permisos).filter((nodo) => {
    const base = normalizarRuta(nodo.ruta);
    return base !== "/" && objetivo.startsWith(`${base}/`);
  });

  if (candidatos.length === 0) return false;

  candidatos.sort(
    (a, b) => normalizarRuta(b.ruta).length - normalizarRuta(a.ruta).length,
  );

  return Boolean(candidatos[0][accion]);
}

export function aplanar(nodos: PermisoNodo[] = []): PermisoNodo[] {
  return nodos.flatMap((nodo) => [nodo, ...aplanar(nodo.childrens ?? [])]);
}

export function construirMenu(permisos: PermisoNodo[] = []): MenuGrupo[] {
  const grupos = new Map<string, MenuNodo[]>();

  for (const nodo of permisos) {
    if (!nodo.ver) continue;

    const modulo = nodo.modulo?.trim() || "General";
    const lista = grupos.get(modulo) ?? [];
    lista.push(nodo);
    grupos.set(modulo, lista);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([modulo, nodos]) => ({ modulo, nodos }));
}

/** Primera pantalla navegable, usada como destino tras el login. */
export function primeraRuta(permisos: PermisoNodo[] = []): string {
  const rutas = aplanar(permisos)
    .filter((nodo) => nodo.ver)
    .map((nodo) => normalizarRuta(nodo.ruta))
    .filter((ruta) => ruta !== "#");

  return rutas[0] ?? "/sin-acceso";
}

export function rutaActiva(pathname: string, ruta: string) {
  const objetivo = normalizarRuta(ruta);
  if (objetivo === "/") return pathname === "/";
  return pathname === objetivo || pathname.startsWith(`${objetivo}/`);
}
