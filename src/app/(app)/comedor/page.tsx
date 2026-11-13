"use client";

import { CalendarClock, ClipboardList, UtensilsCrossed } from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function ComedorPage() {
  return (
    <ModuleHub
      titulo="Comedor"
      descripcion="Turnos, menús publicados y solicitudes de comida del personal."
      accesos={[
        {
          href: "/comedor/turnos",
          titulo: "Turnos",
          descripcion: "Turnos semanales, quincenales o mensuales.",
          icono: CalendarClock,
          permiso: "/comedor",
        },
        {
          href: "/comedor/menus",
          titulo: "Menús",
          descripcion: "Menús publicados con sus platillos por día.",
          icono: UtensilsCrossed,
          permiso: "/comedor",
        },
        {
          href: "/comedor/solicitudes",
          titulo: "Solicitudes",
          descripcion: "Separa tus comidas del siguiente menú.",
          icono: ClipboardList,
          permiso: "/comedor",
        },
      ]}
    />
  );
}
