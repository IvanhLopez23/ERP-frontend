import { agregarCookies, backendWithAuth } from "@/lib/auth/server";

export async function GET() {
  const { response, cookies } = await backendWithAuth("/auth/perfil", {
    method: "GET",
  });

  const headers = agregarCookies(new Headers(), cookies);

  if (!response.ok) {
    return Response.json(
      { autenticado: false },
      { status: response.status === 401 ? 401 : response.status, headers },
    );
  }

  const usuario = await response.json().catch(() => null);

  return Response.json({ autenticado: true, usuario }, { headers });
}
