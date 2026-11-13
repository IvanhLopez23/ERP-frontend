"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CampoArchivo({
  id,
  etiqueta,
  ayuda,
  aceptar,
  nombreArchivo,
  deshabilitado,
  onSeleccionar,
  onQuitar,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  aceptar?: string;
  nombreArchivo?: string | null;
  deshabilitado?: boolean;
  onSeleccionar: (archivo: File) => void;
  onQuitar?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={id} className="font-semibold">
          {etiqueta}
        </Label>
        {ayuda && (
          <p className="text-xs text-muted-foreground">{ayuda}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={aceptar}
          className="sr-only"
          disabled={deshabilitado}
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            if (archivo) onSeleccionar(archivo);
            evento.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={deshabilitado}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="size-3.5" aria-hidden="true" />
          {nombreArchivo ? "Cambiar archivo" : "Seleccionar archivo"}
        </Button>

        {nombreArchivo && (
          <>
            <p className="max-w-full truncate text-xs text-muted-foreground">
              {nombreArchivo}
            </p>
            {onQuitar && (
              <button
                type="button"
                className="cursor-pointer text-xs text-destructive hover:underline"
                onClick={onQuitar}
              >
                Quitar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
