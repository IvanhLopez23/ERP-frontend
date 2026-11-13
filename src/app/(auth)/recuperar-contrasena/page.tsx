"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CircleCheck, LoaderCircle } from "lucide-react";

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

export default function RecuperarContrasenaPage() {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!correo.trim()) {
      setError("Escribe el correo de tu cuenta.");
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim() }),
      });

      if (!respuesta.ok) {
        const data = (await respuesta.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const mensaje = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        setError(mensaje ?? "No fue posible enviar la solicitud.");
        return;
      }

      setEnviado(true);
    } catch {
      setError("No se pudo contactar al servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 cursor-pointer"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver al inicio de sesión
        </Button>

        <Card>
          <CardHeader>
            <h1 className="font-heading text-xl font-medium leading-snug">
              Recuperar contraseña
            </h1>
            <CardDescription>
              Te enviaremos un enlace para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enviado ? (
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
                <CircleCheck
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-medium">Solicitud enviada</p>
                  <p className="mt-1 text-muted-foreground">
                    Si el correo existe, recibirás un enlace en los próximos
                    minutos. Revisa también la carpeta de spam.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4" noValidate>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="correo">Correo electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="h-9"
                    placeholder="tu.correo@empresa.com"
                    value={correo}
                    onChange={(evento) => setCorreo(evento.target.value)}
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
                  {enviando ? "Enviando…" : "Enviar enlace"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
