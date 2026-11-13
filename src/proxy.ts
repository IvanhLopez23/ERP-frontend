import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = [
  "/login",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tieneSesion = request.cookies.has("erp_sesion");

  const esPublica = RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );

  if (!tieneSesion && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (tieneSesion && esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
