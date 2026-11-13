import Link from "next/link";
import { Construction } from "lucide-react";

import { Button } from "@/components/ui/button";

const ETIQUETAS: Record<string, string> = {
  almacen: "Almacén",
  compras: "Compras",
  ventas: "Ventas",
  rh: "Recursos Humanos",
  mantenimiento: "Mantenimiento",
  comedor: "Comedor",
  catalogos: "Catálogos",
  configuraciones: "Configuraciones",
  chat: "Chat",
};

export default async function ModuloPendientePage({
  params,
}: {
  params: Promise<{ modulo: string[] }>;
}) {
  const { modulo } = await params;
  const [primero, ...resto] = modulo;
  const titulo =
    ETIQUETAS[primero] ??
    primero.replace(/-/g, " ").replace(/^\w/, (caracter) => caracter.toUpperCase());
  const detalle = resto.join(" / ");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Construction className="size-6" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {detalle ? `La pantalla “${detalle}” ` : "Este módulo "}
        todavía no está implementado. La base de autenticación, permisos y
        componentes ya está lista para incorporarlo en la siguiente entrega.
      </p>
      <Button variant="outline" size="sm" className="mt-2 cursor-pointer" nativeButton={false} render={<Link href="/dashboard" />}>
        Volver al dashboard
      </Button>
    </div>
  );
}
