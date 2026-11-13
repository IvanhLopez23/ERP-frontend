import { createElement } from "react";

import { iconoPorNombre } from "@/lib/iconos";

/**
 * Los nombres de icono vienen del backend (Material Design Icons). Este
 * envoltorio resuelve el mapa sin crear componentes dentro del render.
 */
export function IconoNombre({
  nombre,
  className,
}: {
  nombre?: string | null;
  className?: string;
}) {
  return createElement(iconoPorNombre(nombre ?? undefined), {
    className,
    "aria-hidden": true,
  });
}
