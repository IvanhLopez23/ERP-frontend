"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { useBranding } from "@/hooks/use-branding";
import { aplanar, rutaActiva, type MenuNodo } from "@/lib/permisos";
import { construirMenuLateral } from "@/lib/menu-lateral";
import { mediaUrl } from "@/lib/format";
import { IconoNombre } from "@/components/shared/icono-nombre";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Props = {
  colapsado: boolean;
  onNavegar?: () => void;
  /** Al hacer clic en un módulo con hijos mientras está colapsado. */
  onExpandir?: () => void;
};

/**
 * El chat solo requiere JWT (no tiene permiso de pantalla en el backend),
 * por eso se agrega como entrada fija del menú.
 */
const NODO_CHAT: MenuNodo = {
  pantallaId: "chat",
  nombre: "Chat",
  icono: "mdi-chat",
  ruta: "/chat",
  modulo: "Comunicación",
  ver: true,
  crear: true,
  editar: true,
  eliminar: true,
  adjuntos: true,
  reportes: true,
};

export function SidebarContenido({ colapsado, onNavegar, onExpandir }: Props) {
  const { sesion, puede, cerrarSesion } = useAuth();
  const branding = useBranding();
  const rutasActivas = new Set(
    aplanar(sesion?.permisos ?? []).map((nodo) => nodo.ruta),
  );
  const grupos = construirMenuLateral(
    (ruta) => puede(ruta),
    (ruta) => rutasActivas.has(ruta),
  );
  const logo = mediaUrl(branding.logoUrl);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4",
          colapsado && "justify-center px-0",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
              unoptimized
            />
          ) : (
            <span className="text-[11px] font-semibold tracking-tight">
              {branding.appName.slice(0, 3).toUpperCase()}
            </span>
          )}
        </span>
        {!colapsado && (
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
            {branding.appName}
          </span>
        )}
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {grupos.length === 0 && !colapsado && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No hay pantallas asignadas a tu rol.
          </p>
        )}

        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.modulo}>
              {!colapsado && (
                <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {grupo.modulo}
                </p>
              )}
              <ul className="space-y-0.5">
                {grupo.nodos.map((nodo) => (
                  <li key={nodo.pantallaId || nodo.ruta}>
                    <NodoMenu
                      nodo={nodo}
                      colapsado={colapsado}
                      onNavegar={onNavegar}
                      onExpandir={onExpandir}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            {!colapsado && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Comunicación
              </p>
            )}
            <ul className="space-y-0.5">
              <li>
                <NodoMenu
                  nodo={NODO_CHAT}
                  colapsado={colapsado}
                  onNavegar={onNavegar}
                  onExpandir={onExpandir}
                />
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          title={colapsado ? "Cerrar sesión" : undefined}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {!colapsado && "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}

function NodoMenu({
  nodo,
  colapsado,
  onNavegar,
  onExpandir,
}: {
  nodo: MenuNodo;
  colapsado: boolean;
  onNavegar?: () => void;
  onExpandir?: () => void;
}) {
  const pathname = usePathname();
  const hijos = (nodo.childrens ?? []).filter((hijo) => hijo.ver);
  const activo =
    rutaActiva(pathname, nodo.ruta) ||
    hijos.some((hijo) => rutaActiva(pathname, hijo.ruta));
  const [abierto, setAbierto] = useState(activo);

  if (hijos.length > 0) {
    return (
      <Collapsible open={colapsado ? false : abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger
          title={colapsado ? nodo.nombre : undefined}
          onClick={() => {
            if (colapsado) {
              setAbierto(true);
              onExpandir?.();
            }
          }}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            activo && "bg-sidebar-accent text-sidebar-accent-foreground",
            colapsado && "justify-center px-0",
          )}
        >
          <IconoNombre nombre={nodo.icono} className="size-4 shrink-0" />
          {!colapsado && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">
                {nodo.nombre}
              </span>
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  abierto && "rotate-90",
                )}
                aria-hidden="true"
              />
            </>
          )}
        </CollapsibleTrigger>

        {!colapsado && (
          <CollapsibleContent>
            <ul className="mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2.5">
              {hijos.map((hijo) => (
                <li key={hijo.pantallaId || hijo.ruta}>
                  <EnlaceNodo nodo={hijo} onNavegar={onNavegar} />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  }

  return (
    <EnlaceNodo nodo={nodo} colapsado={colapsado} onNavegar={onNavegar} />
  );
}

function EnlaceNodo({
  nodo,
  colapsado = false,
  onNavegar,
}: {
  nodo: MenuNodo;
  colapsado?: boolean;
  onNavegar?: () => void;
}) {
  const pathname = usePathname();
  const activo = rutaActiva(pathname, nodo.ruta);
  const esEnlace = nodo.ruta && nodo.ruta !== "#";

  const clases = cn(
    "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    activo
      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
      : "font-medium",
    colapsado && "justify-center px-0",
  );

  if (!esEnlace) {
    return (
      <span
        className={cn(clases, "cursor-not-allowed opacity-60")}
        title={nodo.nombre}
      >
        <IconoNombre nombre={nodo.icono} className="size-4 shrink-0" />
        {!colapsado && <span className="truncate">{nodo.nombre}</span>}
      </span>
    );
  }

  return (
    <Link
      href={nodo.ruta}
      onClick={onNavegar}
      title={colapsado ? nodo.nombre : undefined}
      aria-current={activo ? "page" : undefined}
      className={clases}
    >
      <IconoNombre nombre={nodo.icono} className="size-4 shrink-0" />
      {!colapsado && <span className="min-w-0 truncate">{nodo.nombre}</span>}
    </Link>
  );
}
