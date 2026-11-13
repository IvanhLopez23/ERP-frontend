import type { NextRequest } from "next/server";

import { API_ORIGIN } from "@/lib/env";

type Contexto = { params: Promise<{ ruta: string[] }> };

/**
 * Sirve los archivos públicos de `/uploads` a través del mismo origen del
 * frontend, para no depender de la URL interna del backend en el navegador.
 */
export async function GET(_request: NextRequest, contexto: Contexto) {
  const { ruta } = await contexto.params;

  if (
    !ruta?.length ||
    ruta.some(
      (segmento) =>
        !segmento ||
        segmento === "." ||
        segmento === ".." ||
        segmento.includes("\\"),
    )
  ) {
    return new Response("Ruta inválida", { status: 400 });
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_ORIGIN}/${ruta.join("/")}`, {
      cache: "no-store",
    });
  } catch {
    return new Response("No disponible", { status: 503 });
  }

  if (!respuesta.ok) {
    return new Response("No encontrado", { status: respuesta.status });
  }

  const headers = new Headers();
  const tipo = respuesta.headers.get("content-type");
  if (tipo) headers.set("content-type", tipo);
  headers.set("cache-control", "public, max-age=86400, immutable");
  headers.set("x-content-type-options", "nosniff");

  return new Response(await respuesta.arrayBuffer(), {
    status: respuesta.status,
    headers,
  });
}
