"use client";

import { ClipboardCheck, PackageSearch, Wrench } from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function MantenimientoPage() {
  return (
    <ModuleHub
      titulo="Mantenimiento"
      descripcion="Equipos, planes preventivos, órdenes de trabajo y refacciones."
      accesos={[
        {
          href: "/mantenimiento/equipos",
          titulo: "Equipos",
          descripcion: "Activos sujetos a mantenimiento y su estado.",
          icono: Wrench,
          permiso: "/mantenimiento/equipos",
        },
        {
          href: "/mantenimiento/planes",
          titulo: "Planes",
          descripcion: "Planes preventivos y predictivos por equipo.",
          icono: ClipboardCheck,
          permiso: "/mantenimiento/planes-mantenimiento",
        },
        {
          href: "/mantenimiento/ordenes",
          titulo: "Órdenes de trabajo",
          descripcion: "Programación, ejecución y cierre de trabajos.",
          icono: ClipboardCheck,
          permiso: "/mantenimiento/ordenes-trabajo",
        },
        {
          href: "/mantenimiento/refacciones",
          titulo: "Refacciones",
          descripcion: "Inventario de refacciones y stock mínimo.",
          icono: PackageSearch,
          permiso: "/mantenimiento/refacciones",
        },
        {
          href: "/mantenimiento/movimientos",
          titulo: "Movimientos de refacción",
          descripcion: "Entradas, salidas y ajustes de refacciones.",
          icono: PackageSearch,
          permiso: "/mantenimiento/refacciones",
        },
      ]}
    />
  );
}
