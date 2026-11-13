"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  total: number;
  pagina: number;
  registros: number;
  onPaginaChange: (pagina: number) => void;
  onRegistrosChange?: (registros: number) => void;
  cargando?: boolean;
  vacio?: ReactNode;
  className?: string;
};

export function DataTable<TData>({
  columns,
  data,
  total,
  pagina,
  registros,
  onPaginaChange,
  onRegistrosChange,
  cargando,
  vacio,
  className,
}: Props<TData>) {
  const tabla = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / registros)),
  });

  const totalPaginas = Math.max(1, Math.ceil(total / registros));
  const desde = total === 0 ? 0 : (pagina - 1) * registros + 1;
  const hasta = Math.min(pagina * registros, total);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            {tabla.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id} className="bg-muted/40 hover:bg-muted/40">
                {grupo.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {cargando ? (
              Array.from({ length: Math.min(registros, 6) }).map((_, indice) => (
                <TableRow key={`cargando-${indice}`}>
                  {columns.map((_, columna) => (
                    <TableCell key={`celda-${columna}`}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : tabla.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {vacio ?? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Sin registros.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              tabla.getRowModel().rows.map((fila) => (
                <TableRow key={fila.id}>
                  {fila.getVisibleCells().map((celda) => (
                    <TableCell key={celda.id}>
                      {flexRender(
                        celda.column.columnDef.cell,
                        celda.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <p className="tabular">
          {total === 0
            ? "0 registros"
            : `${desde}–${hasta} de ${total.toLocaleString("es-MX")} registros`}
        </p>

        <div className="flex items-center gap-3">
          {onRegistrosChange && (
            <label className="flex items-center gap-1.5 text-xs">
              Filas
              <select
                value={registros}
                onChange={(evento) =>
                  onRegistrosChange(Number(evento.target.value))
                }
                className="h-7 cursor-pointer rounded-md border border-input bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Registros por página"
              >
                {[10, 20, 50, 100].map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => onPaginaChange(pagina - 1)}
              disabled={pagina <= 1 || cargando}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="tabular min-w-[86px] text-center text-xs">
              Página {pagina} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => onPaginaChange(pagina + 1)}
              disabled={pagina >= totalPaginas || cargando}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
