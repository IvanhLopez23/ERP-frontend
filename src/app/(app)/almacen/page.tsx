"use client";

import Link from "next/link";
import { ArrowRight, ChartColumn, ClipboardList, Package, Truck, Warehouse } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function AlmacenPage() {
  const { puede } = useAuth();

  const accesos = [
    {
      href: "/almacen/productos",
      titulo: "Productos",
      descripcion:
        "Catálogo, precios, unidad de medida, imagen y estado de cada producto.",
      icono: Package,
      visible: puede("/almacen/productos"),
    },
    {
      href: "/almacen/inventario",
      titulo: "Inventario",
      descripcion:
        "Stock por almacén, cortes mensuales y descarga de CSV.",
      icono: ClipboardList,
      visible: puede("/almacen/inventario"),
    },
    {
      href: "/almacen/salidas",
      titulo: "Salidas de inventario",
      descripcion:
        "Órdenes de salida de productos por almacén con trazabilidad.",
      icono: Truck,
      visible: puede("/almacen/movimientos-inventario"),
    },
    {
      href: "/dashboard/almacen",
      titulo: "Dashboard de almacén",
      descripcion:
        "Valor del inventario, existencias por almacén, entradas y salidas.",
      icono: ChartColumn,
      visible: puede("/almacen"),
    },
  ].filter((acceso) => acceso.visible);

  return (
    <>
      <PageHeader
        titulo="Almacén"
        descripcion="Selecciona el área de almacén que necesitas consultar."
      />

      {accesos.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={Warehouse}
            titulo="Sin pantallas disponibles"
            descripcion="Tu rol no tiene acceso a las pantallas de almacén."
          />
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {accesos.map((acceso) => {
            const Icono = acceso.icono;
            return (
              <Link
                key={acceso.href}
                href={acceso.href}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icono className="size-4" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 text-sm font-semibold">{acceso.titulo}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {acceso.descripcion}
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
