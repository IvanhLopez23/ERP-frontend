export class ApiError extends Error {
  status: number;
  detalles: string[];

  constructor(status: number, mensaje: string, detalles: string[] = []) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
    this.detalles = detalles;
  }
}

export const EVENTO_SESION_EXPIRADA = "erp:sesion-expirada";

type ErrorNest = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

function normalizarError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === "object") {
    const data = payload as ErrorNest;
    const crudo = data.message;
    const detalles = Array.isArray(crudo) ? crudo : crudo ? [crudo] : [];
    const mensaje =
      detalles[0] ??
      data.error ??
      (status === 403
        ? "No tienes permiso para realizar esta acción."
        : "Ocurrió un error inesperado.");
    return new ApiError(status, mensaje, detalles);
  }

  return new ApiError(status, `Error ${status}`);
}

async function leerPayload(response: Response): Promise<unknown> {
  const tipo = response.headers.get("content-type") ?? "";
  if (tipo.includes("application/json")) {
    return response.json().catch(() => null);
  }
  const texto = await response.text().catch(() => "");
  return texto || null;
}

/**
 * Cliente del navegador. Siempre habla con el BFF de Next (`/api/proxy`),
 * que es quien añade el token y renueva la sesión. Nunca ve el JWT.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const esFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!esFormData && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    }
    throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  }

  if (!response.ok) {
    throw normalizarError(response.status, await leerPayload(response));
  }

  if (response.status === 204) return undefined as T;

  const tipo = response.headers.get("content-type") ?? "";
  if (tipo.includes("application/json")) return (await response.json()) as T;

  const texto = await response.text();
  if (!texto) return undefined as T;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return texto as T;
  }
}

/** Descarga binarios (Excel/PDF) manteniendo el token en el servidor. */
export async function apiBlob(
  path: string,
  init: RequestInit = {},
): Promise<{ blob: Blob; nombre: string | null }> {
  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    credentials: "same-origin",
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    }
    throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  }

  if (!response.ok) {
    throw normalizarError(response.status, await leerPayload(response));
  }

  const disposicion = response.headers.get("content-disposition");
  const coincidencia = disposicion?.match(/filename="?([^";]+)"?/i);

  return {
    blob: await response.blob(),
    nombre: coincidencia?.[1] ?? null,
  };
}

export function mensajeDeError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}
