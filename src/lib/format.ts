export function numero(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const limpio = valor.replace(/,/g, "").trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function moneda(valor: unknown, compacto = false) {
  const n = numero(valor);
  if (compacto && Math.abs(n) >= 10_000) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return formatoMoneda.format(n);
}

export function cantidad(valor: unknown, decimales = 2) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: decimales,
  }).format(numero(valor));
}

function aFecha(valor: unknown): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor !== "string") return null;

  // Las fechas de solo día se interpretan en horario local para no saltar un día.
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const fecha = new Date(soloDia ? `${valor}T00:00:00` : valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function fechaCorta(valor: unknown) {
  const fecha = aFecha(valor);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

export function fechaHora(valor: unknown) {
  const fecha = aFecha(valor);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export function fechaISO(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0");
  const dia = `${fecha.getDate()}`.padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function texto(valor: unknown, respaldo = "—") {
  if (valor === null || valor === undefined || valor === "") return respaldo;
  return String(valor);
}

/** Normaliza una hora (`09:00`, `09:00:00`) a `HH:mm` para inputs type="time". */
export function horaCorta(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const coincidencia = /^(\d{1,2}):(\d{2})/.exec(String(valor));
  if (!coincidencia) return String(valor);
  return `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
}

/** Formatea minutos como texto legible ("15 min"). */
export function minutos(valor: unknown) {
  const n = numero(valor);
  return `${n} min`;
}

/** Convierte una ruta `/uploads/...` del backend en una URL same-origin. */
export function mediaUrl(ruta?: string | null) {
  if (!ruta) return null;
  if (/^(https?:)?\/\//i.test(ruta) || ruta.startsWith("data:")) return ruta;
  const limpia = ruta.replace(/^\/+/, "");
  return `/api/media/${limpia}`;
}

export function descargarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
