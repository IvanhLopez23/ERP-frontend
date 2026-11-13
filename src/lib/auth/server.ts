import { cookies } from "next/headers";

import { API_INTERNAL_URL } from "@/lib/env";

export const SESSION_COOKIE = "erp_sesion";

const isProduction = process.env.NODE_ENV === "production";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

export type BackendTokens = {
  token: string;
  refreshToken: string;
};

export type BackendLoginResponse = BackendTokens & {
  rolId: string;
  perfil: {
    nombre: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    genero?: string;
    fechaNacimiento?: string;
    foto?: string | null;
  };
  esAdministrador: boolean;
  permisos: unknown[];
};

function serializarCookie(nombre: string, valor: string, maxAge: number) {
  const partes = [
    `${nombre}=${valor}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) partes.push("Secure");
  return partes.join("; ");
}

/**
 * Ambos tokens viajan en una sola cookie HttpOnly codificada en base64url.
 * Next 16 solo conserva una cabecera `Set-Cookie` por respuesta en los Route
 * Handlers, así que usar dos cookies distintas no es fiable.
 */
export function cookiesDeSesion(tokens: BackendTokens): string[] {
  const valor = Buffer.from(JSON.stringify(tokens), "utf8").toString("base64url");
  return [serializarCookie(SESSION_COOKIE, valor, REFRESH_MAX_AGE)];
}

export function cookiesDeBorrado(): string[] {
  return [serializarCookie(SESSION_COOKIE, "", 0)];
}

export function agregarCookies(headers: Headers, cookiesSet: string[]) {
  for (const cookie of cookiesSet) headers.append("Set-Cookie", cookie);
  return headers;
}

export async function leerTokens(): Promise<BackendTokens | null> {
  const store = await cookies();
  const valor = store.get(SESSION_COOKIE)?.value;
  if (!valor) return null;

  try {
    const data = JSON.parse(
      Buffer.from(valor, "base64url").toString("utf8"),
    ) as Partial<BackendTokens>;
    if (typeof data.token !== "string" || typeof data.refreshToken !== "string") {
      return null;
    }
    return { token: data.token, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  return (await leerTokens())?.token ?? null;
}

/**
 * Renovación con deduplicación. El refresh token rota en el backend, así que
 * dos renovaciones simultáneas invalidarían la sesión: compartimos la promesa
 * por refresh token y cacheamos el par resultante unos segundos.
 */
const inflight = new Map<string, Promise<BackendTokens | null>>();
const recentlyRefreshed = new Map<
  string,
  { tokens: BackendTokens; at: number }
>();

async function requestRefresh(refreshToken: string): Promise<BackendTokens | null> {
  try {
    const response = await fetch(`${API_INTERNAL_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Partial<BackendTokens>;
    if (typeof data.token !== "string" || typeof data.refreshToken !== "string") {
      return null;
    }

    return { token: data.token, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export async function refreshSession(): Promise<BackendTokens | null> {
  const actuales = await leerTokens();
  const refreshToken = actuales?.refreshToken;
  if (!refreshToken) return null;

  const cached = recentlyRefreshed.get(refreshToken);
  if (cached && Date.now() - cached.at < 60_000) return cached.tokens;

  let pending = inflight.get(refreshToken);
  if (!pending) {
    pending = requestRefresh(refreshToken).finally(() => {
      inflight.delete(refreshToken);
    });
    inflight.set(refreshToken, pending);
  }

  const tokens = await pending;
  if (!tokens) return null;

  recentlyRefreshed.set(refreshToken, { tokens, at: Date.now() });
  if (recentlyRefreshed.size > 50) recentlyRefreshed.clear();

  return tokens;
}

export async function callBackend(
  path: string,
  init: RequestInit,
  accessToken: string,
) {
  const url = `${API_INTERNAL_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  return fetch(url, { ...init, headers, cache: "no-store" });
}

export type ResultadoBackend = {
  response: Response;
  /** Set-Cookie a adjuntar si la sesión se renovó (o se invalidó). */
  cookies: string[];
};

/**
 * Ejecuta una petición al backend con el token de la sesión. Si el backend
 * responde 401 se intenta renovar una sola vez y se reintenta.
 */
export async function backendWithAuth(
  path: string,
  init: RequestInit = {},
  options: { retry?: boolean } = {},
): Promise<ResultadoBackend> {
  const token = await getAccessToken();
  if (!token) {
    return {
      response: unauthorized(),
      cookies: cookiesDeBorrado(),
    };
  }

  let response = await callBackend(path, init, token);

  if (response.status === 401 && options.retry !== false) {
    const tokens = await refreshSession();
    if (!tokens) {
      return {
        response: unauthorized("La sesión expiró. Vuelve a iniciar sesión."),
        cookies: cookiesDeBorrado(),
      };
    }
    response = await callBackend(path, init, tokens.token);
    return { response, cookies: cookiesDeSesion(tokens) };
  }

  return { response, cookies: [] };
}

function unauthorized(message = "No hay una sesión activa."): Response {
  return Response.json(
    { statusCode: 401, message, error: "Unauthorized" },
    { status: 401 },
  );
}
