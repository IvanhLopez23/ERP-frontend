export type CuentaContable = {
  publicId: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo: string;
  naturaleza: string;
  nivel?: number;
  permiteMovimientos: boolean;
  activo: boolean;
  padre?: CuentaContable | null;
  padreId?: string | null;
  hijos?: CuentaContable[];
};

export type PeriodoContable = {
  publicId: string;
  anio: number;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  estatus: string;
  fechaCierre?: string | null;
};

export type PolizaDetalle = {
  publicId: string;
  concepto?: string | null;
  debe: number | string;
  haber: number | string;
  referencia?: string | null;
  orden?: number;
  cuenta?: CuentaContable | null;
  centroCosto?: CentroCosto | null;
};

export type Poliza = {
  publicId: string;
  folio: string;
  fecha: string;
  tipo: string;
  concepto: string;
  estatus: string;
  totalDebe: number | string;
  totalHaber: number | string;
  periodo?: PeriodoContable | null;
  centroCosto?: CentroCosto | null;
  usuario?: { nombreUsuario?: string } | null;
  detalles?: PolizaDetalle[];
};

export type CentroCosto = {
  publicId: string;
  codigo: string;
  nombre: string;
  tipo: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type Cobro = {
  publicId: string;
  fecha: string;
  monto: number | string;
  metodoPago: string;
  referencia?: string | null;
  observaciones?: string | null;
  poliza?: { publicId: string; folio: string } | null;
};

export type CuentaCartera = {
  publicId: string;
  folio: string;
  fechaEmision: string;
  fechaVencimiento: string;
  monto: number | string;
  subtotal: number | string;
  iva: number | string;
  saldo: number | string;
  estatus: string;
  observaciones?: string | null;
  cliente?: { publicId: string; codigo?: string; nombre?: string } | null;
  proveedor?: { publicId: string; codigo?: string; nombre?: string } | null;
  venta?: { folio?: string } | null;
  compra?: { folio?: string } | null;
  poliza?: { publicId: string; folio: string } | null;
  polizaCancelacion?: { publicId: string; folio: string } | null;
  cuentaContable?: CuentaContable | null;
  cobros?: Cobro[];
  pagos?: Cobro[];
};

export type Banco = {
  publicId: string;
  nombre: string;
  banco: string;
  numeroCuenta?: string | null;
  clabe?: string | null;
  moneda: string;
  saldoInicial: number | string;
  activo: boolean;
  cuentaContable?: CuentaContable | null;
};

export type MovimientoBancario = {
  publicId: string;
  fecha: string;
  descripcion: string;
  referencia?: string | null;
  cargo: number;
  abono: number;
  saldo?: number | null;
  conciliado: boolean;
  polizaFolio?: string | null;
  conciliaciones?: { publicId: string; polizaDetalleId: string; polizaFolio: string; monto: number }[];
};

export type Presupuesto = {
  publicId: string;
  anio: number;
  mes: number;
  ingresosPresupuestados: number | string;
  gastosPresupuestados: number | string;
  notas?: string | null;
  centroCosto?: CentroCosto | null;
  centroCostoId?: string;
};

export type Nomina = {
  publicId: string;
  anio: number;
  mes: number;
  fecha: string;
  estatus: string;
  totalPercepciones: number;
  totalIsr: number;
  totalImss: number;
  totalOtrasDeducciones: number;
  totalNeto: number;
  imssPatronal: number;
  provisionPrestaciones: number;
  poliza?: { publicId: string; folio: string } | null;
  detalles?: {
    publicId: string;
    codigo: string;
    nombre: string;
    centroCosto?: string | null;
    salarioBase: number;
    percepciones: number;
    isr: number;
    imss: number;
    otrasDeducciones: number;
    neto: number;
  }[];
  porCentro?: {
    codigo?: string;
    nombre?: string;
    percepciones: number;
    isr: number;
    imss: number;
    neto: number;
    empleados: number;
  }[];
};

export type NominaPreview = {
  anio: number;
  mes: number;
  empleados: {
    publicId: string;
    codigo: string;
    nombre: string;
    centroCosto?: string | null;
    salarioBase: number;
    percepciones: number;
    isr: number;
    imss: number;
    otrasDeducciones: number;
    neto: number;
  }[];
  totales: {
    percepciones: number;
    isr: number;
    imss: number;
    otrasDeducciones: number;
    neto: number;
  };
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const TIPOS_CUENTA = [
  "activo",
  "pasivo",
  "capital",
  "ingreso",
  "gasto",
  "resultado",
];

export const NATURALEZAS = ["deudora", "acreedora"];

export const TIPOS_POLIZA = ["ingreso", "egreso", "diario"];

export const ESTATUS_POLIZA = ["borrador", "contabilizada", "cancelada"];

export const METODOS_PAGO = [
  "efectivo",
  "transferencia",
  "tarjeta",
  "cheque",
  "otro",
];

export function nombreMes(mes: number) {
  return MESES[mes - 1] ?? String(mes);
}

export function periodoTexto(anio: number, mes: number) {
  return `${nombreMes(mes)} ${anio}`;
}
