import { API_INTERNAL_URL } from "@/lib/env";

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);

  try {
    const respuesta = await fetch(`${API_INTERNAL_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(cuerpo ?? {}),
      cache: "no-store",
    });

    const data = await respuesta.json().catch(() => null);
    return Response.json(data ?? { message: "Solicitud enviada." }, {
      status: respuesta.status,
    });
  } catch {
    return Response.json(
      {
        statusCode: 503,
        message: "No se pudo conectar con el servidor.",
        error: "Service Unavailable",
      },
      { status: 503 },
    );
  }
}
