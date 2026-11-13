"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldAlert } from "lucide-react";

export type AccesoModulo = {
  href: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  permiso: string;
};

export function ModuleHub({
  titulo,
  descripcion,
  accesos,
}: {
  titulo: string;
  descripcion: string;
  accesos: AccesoModulo[];
}) {
  const { puede } = useAuth();
  const visibles = accesos.filter((acceso) => puede(acceso.permiso));

  return (
    <>
      <PageHeader titulo={titulo} descripcion={descripcion} />

      {visibles.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={ShieldAlert}
            titulo="Sin pantallas disponibles"
            descripcion="Tu rol no tiene acceso a las pantallas de este módulo."
          />
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((acceso) => {
            const Icono = acceso.icono;
            return (
              <Link
                key={acceso.href}
                href={acceso.href}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icono className="size-4" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 text-sm font-semibold">{acceso.titulo}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {acceso.descripcion}
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
