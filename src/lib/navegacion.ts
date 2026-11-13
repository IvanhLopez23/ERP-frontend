export type PantallaUI = {
  nombre: string;
  ruta: string;
  modulo: string;
  icono: string;
};

/**
 * Pantallas implementadas en el frontend. Se usan para completar la paleta de
 * búsqueda porque el backend no expone todas como "pantallas" del menú (por
 * ejemplo, Productos o Empleados cuelgan de un módulo padre).
 */
export const PANTALLAS_UI: PantallaUI[] = [
  { nombre: "Dashboard", ruta: "/dashboard", modulo: "General", icono: "mdi-view-dashboard" },
  { nombre: "Dashboard de almacén", ruta: "/dashboard/almacen", modulo: "Operaciones", icono: "mdi-chart-box" },

  { nombre: "Almacén", ruta: "/almacen", modulo: "Operaciones", icono: "mdi-warehouse" },
  { nombre: "Productos", ruta: "/almacen/productos", modulo: "Operaciones", icono: "mdi-package-variant" },
  { nombre: "Inventario", ruta: "/almacen/inventario", modulo: "Operaciones", icono: "mdi-clipboard-list" },
  { nombre: "Salidas de inventario", ruta: "/almacen/salidas", modulo: "Operaciones", icono: "mdi-export" },

  { nombre: "Categorías", ruta: "/catalogos/categorias", modulo: "Operaciones", icono: "mdi-shape" },
  { nombre: "Unidades de medida", ruta: "/catalogos/unidades-medida", modulo: "Operaciones", icono: "mdi-ruler" },
  { nombre: "Almacenes", ruta: "/catalogos/almacenes", modulo: "Operaciones", icono: "mdi-warehouse" },

  { nombre: "Compras", ruta: "/compras", modulo: "Operaciones", icono: "mdi-cart" },
  { nombre: "Proveedores", ruta: "/compras/proveedores", modulo: "Operaciones", icono: "mdi-truck" },
  { nombre: "Órdenes de compra", ruta: "/compras/registros", modulo: "Operaciones", icono: "mdi-cart" },

  { nombre: "Ventas", ruta: "/ventas", modulo: "Operaciones", icono: "mdi-cash-register" },
  { nombre: "Clientes", ruta: "/ventas/clientes", modulo: "Operaciones", icono: "mdi-account-group" },
  { nombre: "Cotizaciones", ruta: "/ventas/cotizaciones", modulo: "Operaciones", icono: "mdi-file-document" },
  { nombre: "Registro de ventas", ruta: "/ventas/registros", modulo: "Operaciones", icono: "mdi-cash-register" },

  { nombre: "Recursos Humanos", ruta: "/rh", modulo: "Operaciones", icono: "mdi-account-group" },
  { nombre: "Departamentos", ruta: "/rh/departamentos", modulo: "Operaciones", icono: "mdi-file-tree" },
  { nombre: "Puestos", ruta: "/rh/puestos", modulo: "Operaciones", icono: "mdi-badge-account" },
  { nombre: "Empleados", ruta: "/rh/empleados", modulo: "Operaciones", icono: "mdi-account" },
  { nombre: "Contratos", ruta: "/rh/contratos", modulo: "Operaciones", icono: "mdi-file-sign" },
  { nombre: "Asistencias", ruta: "/rh/asistencias", modulo: "Operaciones", icono: "mdi-calendar-check" },
  { nombre: "Solicitudes de permiso", ruta: "/rh/solicitudes-permiso", modulo: "Operaciones", icono: "mdi-calendar-clock" },
  { nombre: "Vacaciones", ruta: "/rh/vacaciones", modulo: "Operaciones", icono: "mdi-beach" },
  { nombre: "Turnos", ruta: "/rh/turnos", modulo: "Operaciones", icono: "mdi-clock-outline" },
  { nombre: "Políticas vacacionales", ruta: "/rh/vacaciones/politicas", modulo: "Operaciones", icono: "mdi-beach" },

  { nombre: "Mantenimiento", ruta: "/mantenimiento", modulo: "Operaciones", icono: "mdi-tools" },
  { nombre: "Equipos", ruta: "/mantenimiento/equipos", modulo: "Operaciones", icono: "mdi-car-wrench" },
  { nombre: "Planes de mantenimiento", ruta: "/mantenimiento/planes", modulo: "Operaciones", icono: "mdi-clipboard-list" },
  { nombre: "Órdenes de trabajo", ruta: "/mantenimiento/ordenes", modulo: "Operaciones", icono: "mdi-clipboard-check" },
  { nombre: "Refacciones", ruta: "/mantenimiento/refacciones", modulo: "Operaciones", icono: "mdi-package-variant-closed" },
  { nombre: "Movimientos de refacción", ruta: "/mantenimiento/movimientos", modulo: "Operaciones", icono: "mdi-transfer" },

  { nombre: "Finanzas", ruta: "/contabilidad", modulo: "Finanzas", icono: "mdi-finance" },
  { nombre: "Catálogo de cuentas", ruta: "/contabilidad/cuentas", modulo: "Finanzas", icono: "mdi-format-list-numbered" },
  { nombre: "Periodos contables", ruta: "/contabilidad/periodos", modulo: "Finanzas", icono: "mdi-calendar-range" },
  { nombre: "Pólizas", ruta: "/contabilidad/polizas", modulo: "Finanzas", icono: "mdi-file-document-multiple" },
  { nombre: "Reportes contables", ruta: "/contabilidad/reportes", modulo: "Finanzas", icono: "mdi-chart-box" },
  { nombre: "Cuentas por cobrar", ruta: "/contabilidad/cxc", modulo: "Finanzas", icono: "mdi-cash-plus" },
  { nombre: "Cuentas por pagar", ruta: "/contabilidad/cxp", modulo: "Finanzas", icono: "mdi-cash-minus" },
  { nombre: "Cartera", ruta: "/contabilidad/cartera", modulo: "Finanzas", icono: "mdi-chart-donut" },
  { nombre: "Bancos", ruta: "/contabilidad/bancos", modulo: "Finanzas", icono: "mdi-bank" },
  { nombre: "Centros de costo", ruta: "/contabilidad/centros-costo", modulo: "Finanzas", icono: "mdi-tag-multiple" },
  { nombre: "Presupuestos", ruta: "/contabilidad/presupuestos", modulo: "Finanzas", icono: "mdi-cash-clock" },
  { nombre: "Nómina contable", ruta: "/contabilidad/nomina", modulo: "Finanzas", icono: "mdi-account-cash" },

  { nombre: "Comedor", ruta: "/comedor", modulo: "General", icono: "mdi-food" },  { nombre: "Turnos de comedor", ruta: "/comedor/turnos", modulo: "General", icono: "mdi-calendar-clock" },
  { nombre: "Menús de comedor", ruta: "/comedor/menus", modulo: "General", icono: "mdi-silverware-fork-knife" },
  { nombre: "Solicitudes de comedor", ruta: "/comedor/solicitudes", modulo: "General", icono: "mdi-calendar-check" },

  { nombre: "Configuraciones", ruta: "/configuraciones", modulo: "Configuraciones", icono: "mdi-cog-outline" },
  { nombre: "Usuarios", ruta: "/configuraciones/usuarios", modulo: "Configuraciones", icono: "mdi-account" },
  { nombre: "Roles", ruta: "/configuraciones/roles", modulo: "Configuraciones", icono: "mdi-shield-account" },
  { nombre: "Permisos", ruta: "/configuraciones/permisos", modulo: "Configuraciones", icono: "mdi-security" },
  { nombre: "Pantallas", ruta: "/configuraciones/pantallas", modulo: "Configuraciones", icono: "i-mdi:monitor" },
  { nombre: "Bitácora de accesos", ruta: "/configuraciones/bitacora-accesos", modulo: "Configuraciones", icono: "material-symbols:lock-outline" },
  { nombre: "Auditoría", ruta: "/configuraciones/auditoria", modulo: "Configuraciones", icono: "mdi-file-document-edit" },
  { nombre: "Apariencia", ruta: "/configuraciones/apariencia", modulo: "Configuraciones", icono: "mdi-palette" },

  { nombre: "Chat", ruta: "/chat", modulo: "Comunicación", icono: "mdi-chat" },
  { nombre: "Mi perfil", ruta: "/perfil", modulo: "General", icono: "mdi-account" },
];
