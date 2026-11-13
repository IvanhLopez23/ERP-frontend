"use client";

import {
  Banknote,
  CalendarRange,
  ChartColumn,
  FileText,
  Landmark,
  ListOrdered,
  Tags,
  Users,
  Wallet,
} from "lucide-react";

import { ModuleHub } from "@/components/shared/module-hub";

export default function ContabilidadPage() {
  return (
    <ModuleHub
      titulo="Finanzas"
      descripcion="Contabilidad, cartera, bancos, presupuestos y nómina contable."
      accesos={[
        {
          href: "/contabilidad/cuentas",
          titulo: "Catálogo de cuentas",
          descripcion: "Árbol de cuentas contables y cuentas de movimiento.",
          icono: ListOrdered,
          permiso: "/contabilidad/cuentas",
        },
        {
          href: "/contabilidad/periodos",
          titulo: "Periodos contables",
          descripcion: "Apertura, cierre y reapertura de periodos mensuales.",
          icono: CalendarRange,
          permiso: "/contabilidad/periodos",
        },
        {
          href: "/contabilidad/polizas",
          titulo: "Pólizas",
          descripcion: "Pólizas de ingreso, egreso y diario.",
          icono: FileText,
          permiso: "/contabilidad/polizas",
        },
        {
          href: "/contabilidad/reportes",
          titulo: "Reportes contables",
          descripcion: "Balanza, estados financieros, IVA y auxiliares.",
          icono: ChartColumn,
          permiso: "/contabilidad/reportes",
        },
        {
          href: "/contabilidad/cxc",
          titulo: "Cuentas por cobrar",
          descripcion: "Cartera de clientes, cobros y cancelaciones.",
          icono: Banknote,
          permiso: "/contabilidad/cxc",
        },
        {
          href: "/contabilidad/cxp",
          titulo: "Cuentas por pagar",
          descripcion: "Cartera de proveedores, pagos y cancelaciones.",
          icono: Banknote,
          permiso: "/contabilidad/cxp",
        },
        {
          href: "/contabilidad/cartera",
          titulo: "Cartera",
          descripcion: "Resumen y antigüedad de saldos.",
          icono: Users,
          permiso: "/contabilidad/cartera",
        },
        {
          href: "/contabilidad/bancos",
          titulo: "Bancos",
          descripcion: "Cuentas bancarias, movimientos y conciliación.",
          icono: Landmark,
          permiso: "/contabilidad/bancos",
        },
        {
          href: "/contabilidad/centros-costo",
          titulo: "Centros de costo",
          descripcion: "Centros, áreas y proyectos.",
          icono: Tags,
          permiso: "/contabilidad/centros-costo",
        },
        {
          href: "/contabilidad/presupuestos",
          titulo: "Presupuestos",
          descripcion: "Presupuesto mensual por centro de costo.",
          icono: Wallet,
          permiso: "/contabilidad/presupuestos",
        },
        {
          href: "/contabilidad/nomina",
          titulo: "Nómina contable",
          descripcion: "Previsualización y contabilización de la nómina.",
          icono: Users,
          permiso: "/contabilidad/nomina",
        },
      ]}
    />
  );
}
