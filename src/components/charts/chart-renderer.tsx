"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cantidad } from "@/lib/format";

export type SerieGrafica = {
  nombre?: string;
  name?: string;
  datos?: number[];
  data?: number[];
};

export type Grafica = {
  tipo?: string;
  labels?: string[];
  series?: SerieGrafica[];
};

const COLORES = ["#1e40af", "#3b82f6", "#60a5fa", "#d97706", "#64748b"];

function nombreSerie(serie: SerieGrafica, indice: number) {
  return serie.nombre ?? serie.name ?? `Serie ${indice + 1}`;
}

function datosSerie(serie: SerieGrafica) {
  return (serie.datos ?? serie.data ?? []).map((valor) => Number(valor) || 0);
}

export function ChartRenderer({
  grafica,
  titulo,
}: {
  grafica: Grafica;
  titulo?: string;
}) {
  const labels = grafica.labels ?? [];
  const series = grafica.series ?? [];
  const tipo = (grafica.tipo ?? "barras").toLowerCase();

  const datos = labels.map((label, indice) => {
    const fila: Record<string, string | number> = { label };
    series.forEach((serie, posicion) => {
      fila[nombreSerie(serie, posicion)] = datosSerie(serie)[indice] ?? 0;
    });
    return fila;
  });

  if (tipo === "tabla") {
    return (
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Periodo
              </th>
              {series.map((serie, indice) => (
                <th
                  key={nombreSerie(serie, indice)}
                  className="px-3 py-2 text-right font-medium text-muted-foreground"
                >
                  {nombreSerie(serie, indice)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, indice) => (
              <tr key={label} className="border-t border-border">
                <td className="px-3 py-1.5">{label}</td>
                {series.map((serie, posicion) => (
                  <td
                    key={nombreSerie(serie, posicion)}
                    className="tabular px-3 py-1.5 text-right"
                  >
                    {cantidad(datosSerie(serie)[indice] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tipo === "dona" || tipo === "pastel" || tipo === "pie") {
    const serie = series[0];
    const valores = serie ? datosSerie(serie) : [];
    const datosDona = labels.map((label, indice) => ({
      name: label,
      value: valores[indice] ?? 0,
    }));

    return (
      <div className="h-[280px] w-full" role="img" aria-label={titulo}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datosDona}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={96}
              paddingAngle={2}
            >
              {datosDona.map((_, indice) => (
                <Cell key={indice} fill={COLORES[indice % COLORES.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(valor) => cantidad(valor)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const comunes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        tickLine={false}
        axisLine={false}
        width={52}
      />
      <Tooltip
        formatter={(valor) => cantidad(valor)}
        contentStyle={{
          borderRadius: 8,
          border: "1px solid var(--border)",
          fontSize: 12,
        }}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
    </>
  );

  return (
    <div className="h-[280px] w-full" role="img" aria-label={titulo}>
      <ResponsiveContainer width="100%" height="100%">
        {tipo === "linea" ? (
          <LineChart data={datos}>
            {comunes}
            {series.map((serie, indice) => (
              <Line
                key={nombreSerie(serie, indice)}
                type="monotone"
                dataKey={nombreSerie(serie, indice)}
                stroke={COLORES[indice % COLORES.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : tipo === "area" ? (
          <AreaChart data={datos}>
            {comunes}
            {series.map((serie, indice) => (
              <Area
                key={nombreSerie(serie, indice)}
                type="monotone"
                dataKey={nombreSerie(serie, indice)}
                stroke={COLORES[indice % COLORES.length]}
                fill={COLORES[indice % COLORES.length]}
                fillOpacity={0.14}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart
            data={datos}
            layout={
              tipo === "barras-horizontales" ? "vertical" : "horizontal"
            }
          >
            {comunes}
            {series.map((serie, indice) => (
              <Bar
                key={nombreSerie(serie, indice)}
                dataKey={nombreSerie(serie, indice)}
                fill={COLORES[indice % COLORES.length]}
                radius={[3, 3, 0, 0]}
                stackId={tipo === "barras-apiladas" ? "pila" : undefined}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
