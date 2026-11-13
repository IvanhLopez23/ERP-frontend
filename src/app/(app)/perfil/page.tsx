"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { iniciales, nombreCompleto } from "@/lib/auth/storage";
import { fechaCorta, mediaUrl } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PerfilPage() {
  const { sesion, cerrarSesion, puede } = useAuth();
  const foto = mediaUrl(sesion?.perfil?.foto);

  const roles = useQuery<{ publicId: string; descripcion?: string | null }[]>({
    queryKey: ["roles-select"],
    queryFn: () => apiFetch("/roles"),
    enabled: puede("/configuraciones/roles"),
    staleTime: 5 * 60_000,
  });

  const nombreRol =
    roles.data?.find((rol) => rol.publicId === sesion?.rolId)?.descripcion ??
    (sesion?.esAdministrador ? "Administrador" : "Rol del sistema");

  const datos = [
    { etiqueta: "Usuario", valor: sesion?.nombreUsuario ?? "—" },
    { etiqueta: "Correo", valor: sesion?.correo ?? "—" },
    {
      etiqueta: "Fecha de nacimiento",
      valor: sesion?.perfil?.fechaNacimiento
        ? fechaCorta(sesion.perfil.fechaNacimiento)
        : "—",
    },
    { etiqueta: "Rol", valor: nombreRol },
  ];

  return (
    <>
      <PageHeader
        titulo="Mi perfil"
        descripcion="Datos de tu cuenta y de la sesión activa."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-4 text-center">
            <Avatar className="size-20">
              {foto && <AvatarImage src={foto} alt="" />}
              <AvatarFallback className="text-xl font-semibold">
                {iniciales(sesion)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">{nombreCompleto(sesion)}</p>
              <p className="text-sm text-muted-foreground">
                {sesion?.correo ?? sesion?.nombreUsuario}
              </p>
            </div>
            {sesion?.esAdministrador && (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Administrador
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full cursor-pointer"
              onClick={() => void cerrarSesion()}
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Datos de la cuenta</CardTitle>
            <CardDescription>
              La edición de tu perfil se realiza desde Configuraciones → Usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {datos.map((dato) => (
                <div
                  key={dato.etiqueta}
                  className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <dt className="text-sm text-muted-foreground">
                    {dato.etiqueta}
                  </dt>
                  <dd className="truncate font-mono text-sm">{dato.valor}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
