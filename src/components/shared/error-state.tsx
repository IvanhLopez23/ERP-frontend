"use client";

import { Info, RefreshCw } from "lucide-react";

import { mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function ErrorState({
  error,
  onReintentar,
  titulo = "No se pudo cargar la información",
}: {
  error: unknown;
  onReintentar?: () => void;
  titulo?: string;
}) {
  const status = (error as { status?: number })?.status;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
        <Info className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-1 text-sm font-semibold text-foreground">{titulo}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {mensajeDeError(error)}
      </p>
      {status === 403 && (
        <p className="text-xs text-muted-foreground">
          Si necesitas acceso, solicítalo al administrador del sistema.
        </p>
      )}
      {onReintentar && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 cursor-pointer"
          onClick={onReintentar}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
