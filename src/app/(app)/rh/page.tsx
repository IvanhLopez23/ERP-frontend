"use client";

import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Clock,
  IdCard,
  Network,
  UserRound,
  Users,
} from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function RhPage() {
  return (
    <ModuleHub
      titulo="Recursos Humanos"
      descripcion="Estructura organizacional, personal y control de asistencia."
      accesos={[
        {
          href: "/rh/departamentos",
          titulo: "Departamentos",
          descripcion: "Áreas de la organización.",
          icono: Network,
          permiso: "/rh/departamentos",
        },
        {
          href: "/rh/puestos",
          titulo: "Puestos",
          descripcion: "Puestos, sueldo mínimo y máximo.",
          icono: IdCard,
          permiso: "/rh/puestos",
        },
        {
          href: "/rh/empleados",
          titulo: "Empleados",
          descripcion: "Expediente del personal y su asignación.",
          icono: Users,
          permiso: "/rh/empleados",
        },
        {
          href: "/rh/contratos",
          titulo: "Contratos",
          descripcion: "Contratos por empleado y vigencia.",
          icono: ClipboardList,
          permiso: "/rh/contratos",
        },
        {
          href: "/rh/asistencias",
          titulo: "Asistencias",
          descripcion: "Registro diario de entradas y salidas.",
          icono: CalendarCheck,
          permiso: "/rh/asistencias",
        },
        {
          href: "/rh/solicitudes-permiso",
          titulo: "Solicitudes de permiso",
          descripcion: "Permisos y vacaciones solicitadas por el personal.",
          icono: CalendarClock,
          permiso: "/rh/solicitudes-permiso",
        },
        {
          href: "/rh/turnos",
          titulo: "Turnos",
          descripcion: "Turnos de trabajo y su periodicidad.",
          icono: Clock,
          permiso: "/rh/turnos",
        },
        {
          href: "/rh/vacaciones",
          titulo: "Vacaciones",
          descripcion: "Políticas, saldos e historial vacacional.",
          icono: UserRound,
          permiso: "/rh/vacaciones",
        },
      ]}
    />
  );
}
