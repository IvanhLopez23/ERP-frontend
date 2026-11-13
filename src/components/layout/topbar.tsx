"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, Fragment } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { aplanar } from "@/lib/permisos";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

const ETIQUETAS: Record<string, string> = {
  dashboard: "Dashboard",
  almacen: "Almacén",
  compras: "Compras",
  ventas: "Ventas",
  rh: "Recursos Humanos",
  mantenimiento: "Mantenimiento",
  comedor: "Comedor",
  chat: "Chat",
  configuraciones: "Configuraciones",
  perfil: "Mi perfil",
  productos: "Productos",
  categorias: "Categorías",
  "unidades-medida": "Unidades de medida",
  almacenes: "Almacenes",
  inventario: "Inventario",
  "movimientos-inventario": "Movimientos de inventario",
  proveedores: "Proveedores",
  clientes: "Clientes",
  cotizaciones: "Cotizaciones",
  usuarios: "Usuarios",
  roles: "Roles",
  permisos: "Permisos",
  pantallas: "Pantallas",
  apariencia: "Apariencia",
  "sin-acceso": "Sin acceso",
};

export function Topbar({
  onAbrirMenu,
  colapsado,
  onAlternar,
}: {
  onAbrirMenu: () => void;
  colapsado: boolean;
  onAlternar: () => void;
}) {
  const pathname = usePathname();
  const { sesion } = useAuth();
  const [paletaAbierta, setPaletaAbierta] = useState(false);

  useEffect(() => {
    const manejar = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setPaletaAbierta((abierto) => !abierto);
      }
    };
    window.addEventListener("keydown", manejar);
    return () => window.removeEventListener("keydown", manejar);
  }, []);

  const migas = useMemo(() => {
    const nombres = new Map<string, string>();
    for (const nodo of aplanar(sesion?.permisos ?? [])) {
      nombres.set(nodo.ruta.replace(/\/+$/, "") || "/", nodo.nombre);
    }

    const segmentos = pathname.split("/").filter(Boolean);
    const acumulado: { href: string; label: string }[] = [];

    let ruta = "";
    for (const segmento of segmentos) {
      ruta += `/${segmento}`;
      const label =
        nombres.get(ruta) ??
        ETIQUETAS[segmento] ??
        segmento.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
      acumulado.push({ href: ruta, label });
    }

    return acumulado;
  }, [pathname, sesion]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer lg:hidden"
          onClick={onAbrirMenu}
          aria-label="Abrir menú de navegación"
        >
          <Menu className="size-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden cursor-pointer lg:inline-flex"
          onClick={onAlternar}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          )}
        </Button>

        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="hidden sm:block">
              <BreadcrumbLink render={<Link href="/" />}>Inicio</BreadcrumbLink>
            </BreadcrumbItem>
            {migas.map((miga, indice) => {
              const esUltima = indice === migas.length - 1;
              return (
                <Fragment key={miga.href}>
                  <BreadcrumbSeparator className="hidden sm:block" />
                  <BreadcrumbItem className="min-w-0">
                    {esUltima ? (
                      <BreadcrumbPage className="truncate">
                        {miga.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        render={<Link href={miga.href} />}
                        className="truncate"
                      >
                        {miga.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hidden cursor-pointer gap-2 text-muted-foreground md:flex"
            onClick={() => setPaletaAbierta(true)}
          >
            <Search className="size-3.5" aria-hidden="true" />
            <span>Buscar</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Ctrl K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer md:hidden"
            onClick={() => setPaletaAbierta(true)}
            aria-label="Buscar pantalla"
          >
            <Search className="size-4" aria-hidden="true" />
          </Button>

          <ThemeToggle />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <UserMenu />
        </div>
      </header>

      <CommandPalette open={paletaAbierta} onOpenChange={setPaletaAbierta} />
    </>
  );
}
