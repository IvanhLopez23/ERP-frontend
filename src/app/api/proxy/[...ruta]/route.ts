import type { NextRequest } from "next/server";

import { agregarCookies, backendWithAuth } from "@/lib/auth/server";

type Contexto = { params: Promise<{ ruta: string[] }> };

const METODOS_CON_CUERPO = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CABECERAS_DE_RESPUESTA = [
  "content-type",
  "content-disposition",
  "cache-control",
  "etag",
  "last-modified",
  "content-range",
  "accept-ranges",
];

function rutaSegura(segmentos: string[]): string | null {
  if (!segmentos.length) return null;

  for (const segmento of segmentos) {
    if (!segmento || segmento === "." || segmento === ".." || segmento.includes("\\")) {
      return null;
    }
  }

  return `/${segmentos.join("/")}`;
}

/** Defensa CSRF: las mutaciones deben venir del mismo origen. */
function origenValido(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") return true;

  const origen = request.headers.get("origin");
  if (!origen) return true; // p. ej. peticiones server-side

  try {
    return new URL(origen).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function manejar(request: NextRequest, contexto: Contexto) {
  if (!origenValido(request)) {
    return Response.json(
      { statusCode: 403, message: "Origen no permitido.", error: "Forbidden" },
      { status: 403 },
    );
  }

  const { ruta } = await contexto.params;
  const path = rutaSegura(ruta);

  if (!path) {
    return Response.json(
      { statusCode: 400, message: "Ruta inválida.", error: "Bad Request" },
      { status: 400 },
    );
  }

  const headers = new Headers();
  for (const nombre of [
    "content-type",
    "accept",
    "range",
    "if-none-match",
    "if-modified-since",
  ]) {
    const valor = request.headers.get(nombre);
    if (valor) headers.set(nombre, valor);
  }

  const body = METODOS_CON_CUERPO.has(request.method)
    ? await request.arrayBuffer()
    : undefined;

  let resultado: Awaited<ReturnType<typeof backendWithAuth>>;
  try {
    resultado = await backendWithAuth(path + request.nextUrl.search, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    });
  } catch {
    return Response.json(
      {
        statusCode: 503,
        message:
          "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.",
        error: "Service Unavailable",
      },
      { status: 503 },
    );
  }

  const { response: respuesta, cookies } = resultado;

  const salida = new Headers();
  for (const nombre of CABECERAS_DE_RESPUESTA) {
    const valor = respuesta.headers.get(nombre);
    if (valor) salida.set(nombre, valor);
  }
  agregarCookies(salida, cookies);

  if ([204, 205, 304].includes(respuesta.status)) {
    return new Response(null, { status: respuesta.status, headers: salida });
  }

  return new Response(await respuesta.arrayBuffer(), {
    status: respuesta.status,
    headers: salida,
  });
}

export const GET = manejar;
export const POST = manejar;
export const PUT = manejar;
export const PATCH = manejar;
export const DELETE = manejar;
export const HEAD = manejar;
