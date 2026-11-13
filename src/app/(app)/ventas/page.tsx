"use client";

import { FileText, Handshake, ShoppingBag } from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function VentasPage() {
  return (
    <ModuleHub
      titulo="Ventas"
      descripcion="Clientes, cotizaciones y ventas del negocio."
      accesos={[
        {
          href: "/ventas/clientes",
          titulo: "Clientes",
          descripcion: "Catálogo de clientes y prospectos.",
          icono: Handshake,
          permiso: "/ventas/clientes",
        },
        {
          href: "/ventas/cotizaciones",
          titulo: "Cotizaciones",
          descripcion: "Propuestas con vigencia y seguimiento de estatus.",
          icono: FileText,
          permiso: "/ventas/cotizaciones",
        },
        {
          href: "/ventas/registros",
          titulo: "Ventas",
          descripcion: "Ventas confirmadas y descuento de inventario.",
          icono: ShoppingBag,
          permiso: "/ventas/ventas",
        },
      ]}
    />
  );
}
