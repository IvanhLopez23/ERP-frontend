"use client";

import { ShoppingCart, Truck } from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function ComprasPage() {
  return (
    <ModuleHub
      titulo="Compras"
      descripcion="Administra proveedores y el ciclo de órdenes de compra."
      accesos={[
        {
          href: "/compras/proveedores",
          titulo: "Proveedores",
          descripcion: "Datos fiscales y de contacto de los proveedores.",
          icono: Truck,
          permiso: "/compras/proveedores",
        },
        {
          href: "/compras/registros",
          titulo: "Compras",
          descripcion: "Órdenes de compra, recepción y cancelación.",
          icono: ShoppingCart,
          permiso: "/compras/compras",
        },
      ]}
    />
  );
}
