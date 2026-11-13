"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";

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

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Formulario />
    </Suspense>
  );
}

function Formulario() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!token) {
      setError("El enlace no incluye un token válido. Solicita uno nuevo.");
      return;
    }
    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nuevaContrasena: contrasena }),
      });

      if (!respuesta.ok) {
        const data = (await respuesta.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const mensaje = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        setError(mensaje ?? "No fue posible actualizar la contraseña.");
        return;
      }

      setListo(true);
    } catch {
      setError("No se pudo contactar al servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver al inicio de sesión
        </Link>

        <Card>
          <CardHeader>
            <h1 className="font-heading text-xl font-medium leading-snug">
              Nueva contraseña
            </h1>
            <CardDescription>
              Define una contraseña segura para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listo ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Tu contraseña se actualizó correctamente.
                  </AlertDescription>
                </Alert>
                <Button className="w-full cursor-pointer" nativeButton={false} render={<Link href="/login" />}>
                  Ir a iniciar sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4" noValidate>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="contrasena">Contraseña</Label>
                  <Input
                    id="contrasena"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    className="h-9"
                    value={contrasena}
                    onChange={(evento) => setContrasena(evento.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmacion">Confirmar contraseña</Label>
                  <Input
                    id="confirmacion"
                    type="password"
                    autoComplete="new-password"
                    className="h-9"
                    value={confirmacion}
                    onChange={(evento) => setConfirmacion(evento.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="h-9 w-full cursor-pointer"
                  disabled={enviando}
                >
                  {enviando && (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  )}
                  {enviando ? "Guardando…" : "Guardar contraseña"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
