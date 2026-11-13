import { cn } from "@/lib/utils";

const VERDE =
  /^(activo|activa|recibida|completada|aprobada|presente|operativo|pagada|contabilizada|abierto)$/i;
const AMBAR =
  /^(pendiente|en_progreso|prospecto|permiso|en_reparacion|parcial|borrador)$/i;
const ROJO = /^(cancelada|cancelado|rechazada|vencida|ausente|baja|inactivo|inactiva)$/i;

export function EstadoBadge({
  estado,
  activo,
  className,
}: {
  estado?: string | null;
  activo?: boolean;
  className?: string;
}) {
  const texto =
    estado ?? (activo === undefined ? "—" : activo ? "Activo" : "Inactivo");

  const tono =
    typeof activo === "boolean"
      ? activo
        ? "verde"
        : "neutro"
      : VERDE.test(texto)
        ? "verde"
        : AMBAR.test(texto)
          ? "ambar"
          : ROJO.test(texto)
            ? "rojo"
            : "neutro";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        tono === "verde" &&
          "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
        tono === "ambar" &&
          "border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-400",
        tono === "rojo" &&
          "border-red-600/25 bg-red-600/10 text-red-700 dark:text-red-400",
        tono === "neutro" && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          tono === "verde" && "bg-emerald-600",
          tono === "ambar" && "bg-amber-500",
          tono === "rojo" && "bg-red-600",
          tono === "neutro" && "bg-muted-foreground",
        )}
      />
      {texto.replace(/_/g, " ")}
    </span>
  );
}
