"use client";

import {
  Building2,
  KeyRound,
  MonitorCheck,
  Palette,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function ConfiguracionesPage() {
  return (
    <ModuleHub
      titulo="Configuraciones"
      descripcion="Usuarios, roles, permisos, pantallas y personalización del sistema."
      accesos={[
        {
          href: "/configuraciones/usuarios",
          titulo: "Usuarios",
          descripcion: "Cuentas, rol asignado y estado de acceso.",
          icono: Users,
          permiso: "/configuraciones/usuarios",
        },
        {
          href: "/configuraciones/roles",
          titulo: "Roles",
          descripcion: "Roles del sistema y acceso total.",
          icono: ShieldCheck,
          permiso: "/configuraciones/roles",
        },
        {
          href: "/configuraciones/permisos",
          titulo: "Permisos",
          descripcion: "Matriz de acciones por rol y pantalla.",
          icono: KeyRound,
          permiso: "/configuraciones/permisos",
        },
        {
          href: "/configuraciones/pantallas",
          titulo: "Pantallas",
          descripcion: "Menú del sistema, rutas e iconos.",
          icono: MonitorCheck,
          permiso: "/configuraciones/pantallas",
        },
        {
          href: "/configuraciones/bitacora-accesos",
          titulo: "Bitácora de accesos",
          descripcion: "Intentos de acceso autorizados y rechazados.",
          icono: ScrollText,
          permiso: "/configuraciones/bitacora-accesos",
        },
        {
          href: "/configuraciones/auditoria",
          titulo: "Auditoría",
          descripcion: "Acciones auditadas sobre la API.",
          icono: Building2,
          permiso: "/configuraciones/auditoria",
        },
        {
          href: "/configuraciones/apariencia",
          titulo: "Apariencia",
          descripcion: "Nombre, colores, tipografía y logos.",
          icono: Palette,
          permiso: "/configuraciones/apariencia",
        },
      ]}
    />
  );
}
