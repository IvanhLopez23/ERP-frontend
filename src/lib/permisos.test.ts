import { describe, expect, it } from "vitest";

import type { PermisoNodo } from "@/lib/auth/types";
import {
  construirMenu,
  primeraRuta,
  puede,
  rutaActiva,
} from "@/lib/permisos";
import { construirMenuLateral } from "@/lib/menu-lateral";

function nodo(parcial: Partial<PermisoNodo>): PermisoNodo {
  return {
    pantallaId: parcial.ruta ?? "pantalla",
    nombre: parcial.nombre ?? "Pantalla",
    icono: parcial.icono ?? "mdi-circle-outline",
    ruta: parcial.ruta ?? "/",
    ver: true,
    crear: false,
    editar: false,
    eliminar: false,
    adjuntos: false,
    reportes: false,
    ...parcial,
  };
}

const permisos: PermisoNodo[] = [
  nodo({ ruta: "/almacen", nombre: "Almacén", modulo: "Operaciones", editar: true }),
  nodo({
    ruta: "/configuraciones",
    nombre: "Configuraciones",
    modulo: "Configuraciones",
    ver: false,
  }),
  nodo({
    ruta: "/dashboard",
    nombre: "Dashboard",
    modulo: "General",
    ver: true,
  }),
];

describe("puede", () => {
  it("concede todo a un administrador", () => {
    expect(puede([], true, "/cualquier/ruta", "eliminar")).toBe(true);
  });

  it("evalúa la acción sobre la ruta exacta", () => {
    expect(puede(permisos, false, "/almacen", "editar")).toBe(true);
    expect(puede(permisos, false, "/almacen", "eliminar")).toBe(false);
  });

  it("hereda del permiso padre más específico", () => {
    expect(puede(permisos, false, "/almacen/productos", "editar")).toBe(true);
    expect(puede(permisos, false, "/almacen/productos", "crear")).toBe(false);
  });

  it("niega rutas sin permiso", () => {
    expect(puede(permisos, false, "/ventas", "ver")).toBe(false);
  });

  it("respeta ver=false en el nodo exacto", () => {
    expect(puede(permisos, false, "/configuraciones", "ver")).toBe(false);
    expect(puede(permisos, false, "/configuraciones/roles", "ver")).toBe(false);
  });

  it("devuelve false sin sesión de permisos", () => {
    expect(puede([], false, "/almacen", "ver")).toBe(false);
  });
});

describe("construirMenu", () => {
  it("filtra por ver y agrupa por módulo", () => {
    const grupos = construirMenu(permisos);
    expect(grupos.map((grupo) => grupo.modulo)).toEqual([
      "General",
      "Operaciones",
    ]);
    expect(grupos[1].nodos.map((item) => item.nombre)).toEqual(["Almacén"]);
  });

  it("asigna General cuando no hay módulo", () => {
    const grupos = construirMenu([nodo({ ruta: "/x", modulo: undefined })]);
    expect(grupos[0].modulo).toBe("General");
  });
});

describe("construirMenuLateral", () => {
  it("anida los submódulos de operaciones con sus rutas de UI", () => {
    const grupos = construirMenuLateral(() => true);
    const operaciones = grupos.find((grupo) => grupo.modulo === "Operaciones");
    const ventas = operaciones?.nodos.find((nodo) => nodo.ruta === "/ventas");
    const compras = operaciones?.nodos.find((nodo) => nodo.ruta === "/compras");

    expect(ventas?.childrens?.map((hijo) => hijo.ruta)).toContain(
      "/ventas/registros",
    );
    expect(compras?.childrens?.map((hijo) => hijo.ruta)).toContain(
      "/compras/registros",
    );
  });

  it("oculta los nodos sin permiso", () => {
    const grupos = construirMenuLateral(
      (ruta) => ruta === "/compras" || ruta === "/compras/proveedores",
    );
    const operaciones = grupos.find((grupo) => grupo.modulo === "Operaciones");
    const compras = operaciones?.nodos.find((nodo) => nodo.ruta === "/compras");

    expect(compras?.childrens?.map((hijo) => hijo.ruta)).toEqual([
      "/compras/proveedores",
    ]);
    expect(operaciones?.nodos.map((nodo) => nodo.ruta)).toEqual(["/compras"]);
  });

  it("muestra el padre si al menos un hijo tiene permiso", () => {
    const grupos = construirMenuLateral(
      (ruta) => ruta === "/rh/empleados",
    );
    const operaciones = grupos.find((grupo) => grupo.modulo === "Operaciones");

    expect(operaciones?.nodos.map((nodo) => nodo.ruta)).toEqual(["/rh"]);
    expect(operaciones?.nodos[0].childrens?.map((hijo) => hijo.ruta)).toEqual([
      "/rh/empleados",
    ]);
  });

  it("agrupa los catálogos de almacén dentro de Almacén", () => {
    const grupos = construirMenuLateral(() => true);
    const general = grupos.find((grupo) => grupo.modulo === "General");
    const catalogos = general?.nodos.find(
      (nodo) => nodo.ruta === "/catalogos",
    );
    const operaciones = grupos.find(
      (grupo) => grupo.modulo === "Operaciones",
    );
    const almacen = operaciones?.nodos.find(
      (nodo) => nodo.ruta === "/almacen",
    );

    expect(catalogos?.childrens).toBeUndefined();
    expect(almacen?.childrens?.map((hijo) => hijo.ruta)).toEqual([
      "/catalogos/categorias",
      "/catalogos/unidades-medida",
      "/almacen/productos",
      "/almacen/inventario",
      "/almacen/salidas",
      "/catalogos/almacenes",
    ]);
  });

  it("oculta los módulos desactivados en la base de datos", () => {
    const grupos = construirMenuLateral(
      () => true,
      (ruta) => ruta !== "/catalogos",
    );
    const general = grupos.find((grupo) => grupo.modulo === "General");

    expect(general?.nodos.map((nodo) => nodo.ruta)).not.toContain(
      "/catalogos",
    );
  });
});

describe("primeraRuta", () => {
  it("devuelve la primera pantalla navegable", () => {
    expect(primeraRuta(permisos)).toBe("/almacen");
  });

  it("usa /sin-acceso cuando no hay rutas", () => {
    expect(primeraRuta([])).toBe("/sin-acceso");
  });
});

describe("rutaActiva", () => {
  it("marca la ruta exacta y sus hijas", () => {
    expect(rutaActiva("/almacen", "/almacen")).toBe(true);
    expect(rutaActiva("/almacen/productos", "/almacen")).toBe(true);
    expect(rutaActiva("/almacenx", "/almacen")).toBe(false);
  });

  it("trata la raíz de forma estricta", () => {
    expect(rutaActiva("/", "/")).toBe(true);
    expect(rutaActiva("/dashboard", "/")).toBe(false);
  });
});
