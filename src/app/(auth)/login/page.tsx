"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Lock, ShieldCheck, UserRound } from "lucide-react";

import { guardarSesion } from "@/lib/auth/storage";
import type { Sesion } from "@/lib/auth/types";
import { mediaUrl } from "@/lib/format";
import { useBranding } from "@/hooks/use-branding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginEsqueleto />}>
      <LoginFormulario />
    </Suspense>
  );
}

function destinoSeguro(valor: string | null) {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return "/";
  return valor;
}

function LoginFormulario() {
  const router = useRouter();
  const params = useSearchParams();
  const branding = useBranding();
  const logo = mediaUrl(branding.loginLogoUrl ?? branding.logoUrl);

  const [nombreUsuario, setNombreUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destino = destinoSeguro(params.get("redirect"));
  const esDesarrollo = process.env.NODE_ENV === "development";

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!nombreUsuario.trim() || !contrasena) {
      setError("Captura tu usuario y contraseña.");
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreUsuario: nombreUsuario.trim(),
          contrasena,
        }),
      });

      const data = (await respuesta.json().catch(() => null)) as
        | { sesion?: Sesion; message?: string | string[] }
        | null;

      if (!respuesta.ok || !data?.sesion) {
        const mensaje = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        setError(mensaje ?? "No fue posible iniciar sesión.");
        return;
      }

      guardarSesion(data.sesion);
      router.replace(destino);
      router.refresh();
    } catch {
      setError(
        "No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      {/* Panel de marca: oculto en móvil para priorizar el formulario. */}
      <aside className="relative hidden overflow-hidden bg-[#0f1f3d] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[#1e40af]/50 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/20">
            {logo ? (
              <Image
                src={logo}
                alt=""
                width={40}
                height={40}
                className="size-10 object-contain"
                unoptimized
              />
            ) : (
              <ShieldCheck className="size-5" aria-hidden="true" />
            )}
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {branding.appName}
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            Todo tu ERP en un solo lugar.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Almacén, compras, ventas, recursos humanos y mantenimiento con
            permisos por rol y trazabilidad de cada movimiento.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              "Acceso por pantalla, acción y módulo",
              "Información operativa en tiempo real",
              "Sesión protegida en el servidor",
            ].map((punto) => (
              <li key={punto} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#f59e0b]" />
                {punto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          Uso interno · {new Date().getFullYear()}
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground">
              {logo ? (
                <Image
                  src={logo}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 object-contain"
                  unoptimized
                />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
            </span>
            <span className="text-base font-semibold tracking-tight">
              {branding.appName}
            </span>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <h1 className="font-heading text-xl font-medium leading-snug">
                Iniciar sesión
              </h1>
              <CardDescription>
                Ingresa con la cuenta que te asignó el administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={enviar} className="space-y-4" noValidate>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="nombreUsuario">Usuario</Label>
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="nombreUsuario"
                      name="nombreUsuario"
                      autoComplete="username"
                      autoFocus
                      className="h-9 pl-8"
                      placeholder="usuario"
                      value={nombreUsuario}
                      onChange={(evento) => setNombreUsuario(evento.target.value)}
                      aria-invalid={Boolean(error) || undefined}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contrasena">Contraseña</Label>
                    <Link
                      href="/recuperar-contrasena"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="contrasena"
                      name="contrasena"
                      type={mostrar ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-9 pl-8 pr-9"
                      placeholder="••••••••"
                      value={contrasena}
                      onChange={(evento) => setContrasena(evento.target.value)}
                      aria-invalid={Boolean(error) || undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrar((valor) => !valor)}
                      className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={
                        mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {mostrar ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-9 w-full cursor-pointer"
                  disabled={enviando}
                >
                  {enviando && (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {enviando ? "Entrando…" : "Entrar"}
                </Button>
              </form>

              {esDesarrollo && (
                <div className="mt-5 rounded-md border border-dashed border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Entorno de desarrollo
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-muted-foreground">
                      admin / 1234
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="cursor-pointer"
                      onClick={() => {
                        setNombreUsuario("admin");
                        setContrasena("1234");
                        setError(null);
                      }}
                    >
                      Usar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Al continuar aceptas las políticas de uso interno del sistema.
          </p>
        </div>
      </main>
    </div>
  );
}

function LoginEsqueleto() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
