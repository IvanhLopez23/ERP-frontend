import {
  agregarCookies,
  cookiesDeBorrado,
} from "@/lib/auth/server";

export async function POST() {
  const headers = agregarCookies(new Headers(), cookiesDeBorrado());
  return Response.json({ ok: true }, { headers });
}
