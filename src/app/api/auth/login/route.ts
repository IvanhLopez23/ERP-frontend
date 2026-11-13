import { z } from "zod";

import { API_INTERNAL_URL } from "@/lib/env";
import {
  agregarCookies,
  cookiesDeSesion,
  type BackendLoginResponse,
} from "@/lib/auth/server";

const esquema = z.object({
  nombreUsuario: z.string().trim().min(1, "El usuario es obligatorio."),
  contrasena: z.string().min(1, "La contraseña es obligatoria."),
});

function decodificarJwt(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const relleno = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(relleno)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const validacion = esquema.safeParse(cuerpo);

  if (!validacion.success) {
    return Response.json(
      {
        statusCode: 400,
        message: validacion.error.issues.map((issue) => issue.message),
        error: "Bad Request",
      },
      { status: 400 },
    );
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_INTERNAL_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(validacion.data),
      cache: "no-store",
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

  const payload = await respuesta.json().catch(() => null);

  if (!respuesta.ok || !payload) {
    return Response.json(
      payload ?? {
        statusCode: respuesta.status,
        message: "No fue posible iniciar sesión.",
        error: "Unauthorized",
      },
      { status: respuesta.status },
    );
  }

  const data = payload as BackendLoginResponse;
  if (!data.token || !data.refreshToken) {
    return Response.json(
      {
        statusCode: 502,
        message: "El servidor devolvió una sesión inválida.",
        error: "Bad Gateway",
      },
      { status: 502 },
    );
  }

  const cookies = agregarCookies(
    new Headers(),
    cookiesDeSesion({
      token: data.token,
      refreshToken: data.refreshToken,
    }),
  );

  const claims = decodificarJwt(data.token);

  return Response.json(
    {
      sesion: {
        rolId: data.rolId,
        publicId:
          typeof claims.sub === "string" ? claims.sub : undefined,
        perfil: data.perfil ?? null,
        esAdministrador: Boolean(data.esAdministrador),
        permisos: Array.isArray(data.permisos) ? data.permisos : [],
        nombreUsuario:
          typeof claims.nombreUsuario === "string"
            ? claims.nombreUsuario
            : undefined,
        correo: typeof claims.correo === "string" ? claims.correo : undefined,
      },
    },
    { headers: cookies },
  );
}
