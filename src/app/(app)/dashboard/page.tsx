"use client";

import { useState } from "react";
import { LayoutDashboard } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { nombreCompleto } from "@/lib/auth/storage";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ModuloDashboard } from "@/components/charts/modulo-dashboard";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const MODULOS = [
  {
    valor: "ventas",
    titulo: "Ventas",
    recurso: "/dashboard/ventas",
    permiso: "/ventas",
  },
  {
    valor: "compras",
    titulo: "Compras",
    recurso: "/dashboard/compras",
    permiso: "/compras",
  },
  {
    valor: "almacen",
    titulo: "Almacén",
    recurso: "/dashboard/almacen",
    permiso: "/almacen",
  },
  {
    valor: "rh",
    titulo: "Recursos Humanos",
    recurso: "/dashboard/rh",
    permiso: "/rh",
  },
  {
    valor: "mantenimiento",
    titulo: "Mantenimiento",
    recurso: "/dashboard/mantenimiento",
    permiso: "/mantenimiento",
  },
  {
    valor: "finanzas",
    titulo: "Finanzas",
    recurso: "/dashboard/finanzas",
    permiso: "/contabilidad",
  },
];

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function DashboardPage() {
  const { sesion, puede } = useAuth();

  const disponibles = MODULOS.filter((modulo) => puede(modulo.permiso));
  const [seleccionado, setSeleccionado] = useState(
    disponibles[0]?.valor ?? "",
  );
  const activo = disponibles.some((modulo) => modulo.valor === seleccionado)
    ? seleccionado
    : (disponibles[0]?.valor ?? "");

  return (
    <>
      <PageHeader
        titulo={`${saludo()}, ${nombreCompleto(sesion).split(" ")[0]}`}
        descripcion="Indicadores de los módulos a los que tienes acceso."
      />

      {disponibles.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={LayoutDashboard}
            titulo="Sin dashboards disponibles"
            descripcion="Tu rol no tiene acceso a ningún módulo con dashboard."
          />
        </div>
      ) : (
        <Tabs
          value={activo}
          onValueChange={(valor) => setSeleccionado(String(valor))}
        >
          <TabsList className="h-auto! w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto!">
            {disponibles.map((modulo) => (
              <TabsTrigger
                key={modulo.valor}
                value={modulo.valor}
                className="h-7 flex-none px-2.5"
              >
                {modulo.titulo}
              </TabsTrigger>
            ))}
          </TabsList>

          {disponibles.map((modulo) => (
            <TabsContent key={modulo.valor} value={modulo.valor} className="pt-2">
              {activo === modulo.valor && (
                <ModuloDashboard
                  titulo={modulo.titulo}
                  recurso={modulo.recurso}
                  permiso={modulo.permiso}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </>
  );
}
