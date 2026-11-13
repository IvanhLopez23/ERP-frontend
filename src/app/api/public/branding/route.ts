import { API_INTERNAL_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const respuesta = await fetch(`${API_INTERNAL_URL}/branding`, {
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return Response.json({ data: null }, { status: 200 });
    }

    const data = await respuesta.json().catch(() => ({ data: null }));
    return Response.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // El branding es opcional: si falla, el frontend usa sus valores por defecto.
    return Response.json({ data: null }, { status: 200 });
  }
}
