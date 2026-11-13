"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Pantalla = {
  publicId: string;
  nombre?: string | null;
  ruta?: string | null;
  icono?: string | null;
  orden?: number | string | null;
  subMenu?: string | null;
  activo?: boolean;
  modulo?: string | null;
};

export default function PantallasPage() {
  const { puede } = useAuth();
  const puedePantallas = puede("/configuraciones/pantallas");

  const padres = useQuery<Pantalla[]>({
    queryKey: ["pantallas-padres"],
    queryFn: () => apiFetch<Pantalla[]>("/pantallas/menu/padres"),
    enabled: puedePantallas,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Pantalla>>(
    () => ({
      titulo: "Pantallas",
      descripcion:
        "Definición del menú del sistema: nombre, ruta, icono y módulo.",
      recurso: "/pantallas",
      permiso: "/configuraciones/pantallas",
      singular: "Pantalla",
      genero: "f",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.nombre ?? "Pantalla",
      buscarPlaceholder: "Buscar pantalla…",
      vacioTitulo: "Todavía no hay pantallas",
      vacioDescripcion: "Crea la primera pantalla del menú.",
      columnas: [
        { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
        {
          encabezado: "Ruta",
          celda: (item) => (
            <span className="font-mono text-xs">{texto(item.ruta)}</span>
          ),
        },
        {
          encabezado: "Módulo",
          celda: (item) => texto(item.modulo),
        },
        {
          encabezado: "Orden",
          alineacion: "right",
          celda: (item) => texto(item.orden),
        },
        {
          encabezado: "Icono",
          celda: (item) => (
            <span className="font-mono text-xs text-muted-foreground">
              {texto(item.icono)}
            </span>
          ),
        },
      ],
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, seccion: "Pantalla" },
        { nombre: "ruta", etiqueta: "Ruta", tipo: "text", requerido: true, seccion: "Pantalla" },
        {
          nombre: "icono",
          etiqueta: "Icono",
          tipo: "text",
          requerido: true,
          valorInicial: "mdi-circle-outline",
          ayuda: "Nombre del icono, p. ej. mdi-package-variant.",
          seccion: "Pantalla",
        },
        {
          nombre: "orden",
          etiqueta: "Orden",
          tipo: "number",
          requerido: true,
          valorInicial: "1",
          seccion: "Pantalla",
        },
        {
          nombre: "modulo",
          etiqueta: "Módulo",
          tipo: "text",
          requerido: true,
          valorInicial: "General",
          seccion: "Pantalla",
        },
        {
          nombre: "padreId",
          etiqueta: "Pantalla padre (opcional)",
          tipo: "select",
          ancho: "full",
          soloCrear: true,
          seccion: "Jerarquía",
          opciones: (padres.data ?? []).map((pantalla) => ({
            valor: pantalla.publicId,
            etiqueta: `${pantalla.nombre ?? pantalla.publicId} (${pantalla.ruta ?? ""})`,
          })),
          ayuda:
            "El backend no devuelve el padre al consultar; solo se puede asignar al crear.",
        },
        {
          nombre: "subMenu",
          etiqueta: "Nombre en el submenú (opcional)",
          tipo: "text",
          ancho: "full",
          seccion: "Jerarquía",
        },
      ],
      aValores: (item) => ({
        nombre: item?.nombre ?? "",
        ruta: item?.ruta ?? "",
        icono: item?.icono ?? "mdi-circle-outline",
        orden:
          item?.orden === null || item?.orden === undefined
            ? "1"
            : String(item.orden),
        modulo: item?.modulo ?? "General",
        padreId: "",
        subMenu: item?.subMenu ?? "",
      }),
      aPayload: (valores, original) => {
        const payload: Record<string, unknown> = {
          nombre: String(valores.nombre ?? "").trim(),
          ruta: String(valores.ruta ?? "").trim(),
          icono: String(valores.icono ?? "").trim(),
          orden: Number(valores.orden ?? 1),
          modulo: String(valores.modulo ?? "").trim(),
        };
        if (String(valores.subMenu ?? "").trim()) {
          payload.subMenu = String(valores.subMenu).trim();
        }
        if (!original && String(valores.padreId ?? "").trim()) {
          payload.padreId = String(valores.padreId);
        }
        return payload;
      },
      validar: (valores) => {
        const ruta = String(valores.ruta ?? "").trim();
        if (ruta && !ruta.startsWith("/")) {
          return { ruta: "La ruta debe comenzar con “/”." };
        }
        return null;
      },
    }),
    [padres.data],
  );

  return <ResourcePage config={config} />;
}
