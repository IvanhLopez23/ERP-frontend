import type { MenuGrupo, MenuNodo } from "@/lib/permisos";

export type MenuLateralItem = {
  nombre: string;
  ruta: string;
  icono: string;
  /** Ruta de permiso cuando difiere de la ruta de la pantalla. */
  permiso?: string;
};

export type MenuLateralNodo = MenuLateralItem & {
  hijos?: MenuLateralItem[];
};

export type MenuLateralGrupo = {
  modulo: string;
  nodos: MenuLateralNodo[];
};

/**
 * Jerarquía del menú lateral basada en las pantallas implementadas.
 * El backend usa la ruta como permiso y no siempre coincide con la ruta de la
 * pantalla (p. ej. /compras/registros usa el permiso /compras/compras), por eso
 * cada hijo puede declarar su propia ruta de permiso.
 */
export const MENU_LATERAL: MenuLateralGrupo[] = [
  {
    modulo: "Configuraciones",
    nodos: [
      {
        nombre: "Configuraciones",
        ruta: "/configuraciones",
        icono: "mdi-cog-outline",
        hijos: [
          { nombre: "Roles", ruta: "/configuraciones/roles", icono: "mdi-chemical-weapon" },
          { nombre: "Usuarios", ruta: "/configuraciones/usuarios", icono: "i-lucide-users" },
          { nombre: "Permisos", ruta: "/configuraciones/permisos", icono: "material-symbols:lock-outline" },
          { nombre: "Bitácora de accesos", ruta: "/configuraciones/bitacora-accesos", icono: "mdi-security" },
          { nombre: "Pantallas", ruta: "/configuraciones/pantallas", icono: "i-mdi:monitor" },
          { nombre: "Apariencia", ruta: "/configuraciones/apariencia", icono: "mdi-palette" },
        ],
      },
    ],
  },
  {
    modulo: "General",
    nodos: [
      { nombre: "Dashboard", ruta: "/", icono: "mdi-view-dashboard" },
      {
        nombre: "Catálogos",
        ruta: "/catalogos",
        icono: "mdi-bookshelf",
      },
      {
        nombre: "Comedor",
        ruta: "/comedor",
        icono: "mdi-food",
        hijos: [
          { nombre: "Menús de comedor", ruta: "/comedor/menus", icono: "mdi-silverware-fork-knife" },
          { nombre: "Solicitudes de comedor", ruta: "/comedor/solicitudes", icono: "mdi-calendar-check" },
          { nombre: "Turnos de comedor", ruta: "/comedor/turnos", icono: "mdi-calendar-clock" },
        ],
      },
    ],
  },
  {
    modulo: "Operaciones",
    nodos: [
      {
        nombre: "Almacén",
        ruta: "/almacen",
        icono: "mdi-warehouse",
        hijos: [
          {
            nombre: "Categorías",
            ruta: "/catalogos/categorias",
            permiso: "/almacen/categorias",
            icono: "mdi-shape",
          },
          {
            nombre: "Unidades de medida",
            ruta: "/catalogos/unidades-medida",
            permiso: "/almacen/unidades-medida",
            icono: "mdi-ruler",
          },
          { nombre: "Productos", ruta: "/almacen/productos", icono: "mdi-package-variant-closed" },
          {
            nombre: "Inventario",
            ruta: "/almacen/inventario",
            permiso: "/almacen/inventario",
            icono: "mdi-clipboard-list",
          },
          {
            nombre: "Salidas",
            ruta: "/almacen/salidas",
            permiso: "/almacen/movimientos-inventario",
            icono: "mdi-export",
          },
          {
            nombre: "Almacenes",
            ruta: "/catalogos/almacenes",
            permiso: "/almacen/almacenes",
            icono: "mdi-store",
          },
        ],
      },
      {
        nombre: "Compras",
        ruta: "/compras",
        icono: "mdi-cart",
        hijos: [
          { nombre: "Proveedores", ruta: "/compras/proveedores", icono: "mdi-truck" },
          {
            nombre: "Órdenes de compra",
            ruta: "/compras/registros",
            permiso: "/compras/compras",
            icono: "mdi-file-document",
          },
        ],
      },
      {
        nombre: "RH",
        ruta: "/rh",
        icono: "mdi-account-group",
        hijos: [
          { nombre: "Departamentos", ruta: "/rh/departamentos", icono: "mdi-domain" },
          { nombre: "Puestos", ruta: "/rh/puestos", icono: "mdi-badge-account" },
          { nombre: "Empleados", ruta: "/rh/empleados", icono: "mdi-account-multiple" },
          { nombre: "Contratos", ruta: "/rh/contratos", icono: "mdi-file-sign" },
          { nombre: "Asistencias", ruta: "/rh/asistencias", icono: "mdi-calendar-check" },
          { nombre: "Solicitudes de permiso", ruta: "/rh/solicitudes-permiso", icono: "mdi-file-document-edit" },
          { nombre: "Vacaciones", ruta: "/rh/vacaciones", icono: "mdi-beach" },
          { nombre: "Turnos", ruta: "/rh/turnos", icono: "mdi-clock-outline" },
          {
            nombre: "Políticas vacacionales",
            ruta: "/rh/vacaciones/politicas",
            permiso: "/rh/vacaciones",
            icono: "mdi-beach",
          },
        ],
      },
      {
        nombre: "Mantenimiento",
        ruta: "/mantenimiento",
        icono: "mdi-tools",
        hijos: [
          { nombre: "Equipos", ruta: "/mantenimiento/equipos", icono: "mdi-cog" },
          {
            nombre: "Planes de mantenimiento",
            ruta: "/mantenimiento/planes",
            permiso: "/mantenimiento/planes-mantenimiento",
            icono: "mdi-calendar-clock",
          },
          {
            nombre: "Órdenes de trabajo",
            ruta: "/mantenimiento/ordenes",
            permiso: "/mantenimiento/ordenes-trabajo",
            icono: "mdi-clipboard-text",
          },
          { nombre: "Refacciones", ruta: "/mantenimiento/refacciones", icono: "mdi-car-wrench" },
          {
            nombre: "Movimientos de refacción",
            ruta: "/mantenimiento/movimientos",
            permiso: "/mantenimiento/refacciones",
            icono: "mdi-transfer",
          },
        ],
      },
      {
        nombre: "Ventas",
        ruta: "/ventas",
        icono: "mdi-cash-register",
        hijos: [
          { nombre: "Clientes", ruta: "/ventas/clientes", icono: "mdi-account" },
          { nombre: "Cotizaciones", ruta: "/ventas/cotizaciones", icono: "mdi-file-document-outline" },
          {
            nombre: "Registro de ventas",
            ruta: "/ventas/registros",
            permiso: "/ventas/ventas",
            icono: "mdi-cart",
          },
        ],
      },
      {
        nombre: "Finanzas",
        ruta: "/contabilidad",
        icono: "mdi-finance",
        hijos: [
          { nombre: "Catálogo de cuentas", ruta: "/contabilidad/cuentas", icono: "mdi-format-list-numbered" },
          { nombre: "Periodos contables", ruta: "/contabilidad/periodos", icono: "mdi-calendar-range" },
          { nombre: "Pólizas", ruta: "/contabilidad/polizas", icono: "mdi-file-document-multiple" },
          { nombre: "Reportes contables", ruta: "/contabilidad/reportes", icono: "mdi-chart-box" },
          { nombre: "Cuentas por cobrar", ruta: "/contabilidad/cxc", icono: "mdi-cash-plus" },
          { nombre: "Cuentas por pagar", ruta: "/contabilidad/cxp", icono: "mdi-cash-minus" },
          { nombre: "Cartera", ruta: "/contabilidad/cartera", icono: "mdi-chart-donut" },
          { nombre: "Bancos", ruta: "/contabilidad/bancos", icono: "mdi-bank" },
          { nombre: "Centros de costo", ruta: "/contabilidad/centros-costo", icono: "mdi-tag-multiple" },
          { nombre: "Presupuestos", ruta: "/contabilidad/presupuestos", icono: "mdi-cash-clock" },
          { nombre: "Nómina contable", ruta: "/contabilidad/nomina", icono: "mdi-account-cash" },
        ],
      },
    ],
  },
];

const PERMISOS_NODO = {
  ver: true,
  crear: false,
  editar: false,
  eliminar: false,
  adjuntos: false,
  reportes: false,
};

function aMenuNodo(
  item: MenuLateralItem,
  modulo: string,
  hijos: MenuNodo[] = [],
): MenuNodo {
  return {
    ...PERMISOS_NODO,
    pantallaId: item.ruta,
    nombre: item.nombre,
    ruta: item.ruta,
    icono: item.icono,
    modulo,
    ...(hijos.length > 0 ? { childrens: hijos } : {}),
  };
}

/**
 * Construye el menú lateral con la jerarquía de la UI y valida cada pantalla
 * con el permiso correspondiente. Un padre se muestra si tiene acceso propio
 * o al menos un hijo visible.
 */
export function construirMenuLateral(
  puede: (ruta: string) => boolean,
  moduloActivo: (ruta: string) => boolean = () => true,
): MenuGrupo[] {
  return MENU_LATERAL.map((grupo) => ({
    modulo: grupo.modulo,
    nodos: grupo.nodos.flatMap((nodo) => {
      if (!moduloActivo(nodo.ruta)) return [];

      const hijos = (nodo.hijos ?? [])
        .filter((hijo) => puede(hijo.permiso ?? hijo.ruta))
        .map((hijo) => aMenuNodo(hijo, grupo.modulo));

      if (!puede(nodo.permiso ?? nodo.ruta) && hijos.length === 0) {
        return [];
      }

      return [aMenuNodo(nodo, grupo.modulo, hijos)];
    }),
  })).filter((grupo) => grupo.nodos.length > 0);
}
