"use client";

import Image from "next/image";
import { useRef } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CampoImagen({
  id,
  etiqueta,
  ayuda = "JPG, PNG o WebP. Máximo 5 MB.",
  srcActual,
  nombreArchivo,
  deshabilitado,
  onSeleccionar,
  onQuitar,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  srcActual?: string | null;
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
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted">
          {srcActual ? (
            <Image
              src={srcActual}
              alt=""
              width={56}
              height={56}
              className="size-14 object-cover"
              unoptimized
            />
          ) : (
            <ImagePlus
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp"
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
            {nombreArchivo ? "Cambiar imagen" : "Seleccionar imagen"}
          </Button>
        </div>
      </div>

      {nombreArchivo ? (
        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">
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
        </div>
      ) : (
        srcActual && (
          <p className="text-xs text-muted-foreground">Imagen actual</p>
        )
      )}
    </div>
  );
}
