"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default function SinAccesoPage() {
  return (
    <>
      <PageHeader
        titulo="Sin acceso"
        descripcion="Tu rol no tiene pantallas asignadas o el permiso expiró."
      />
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icono={ShieldAlert}
          titulo="No hay una pantalla disponible"
          descripcion="Solicita al administrador que asigne pantallas y permisos a tu rol."
          accion={
            <Button variant="outline" size="sm" className="cursor-pointer" nativeButton={false} render={<Link href="/perfil" />}>
              Ver mi perfil
            </Button>
          }
        />
      </div>
    </>
  );
}
