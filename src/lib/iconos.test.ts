import { Circle, LibraryBig, Package, Settings } from "lucide-react";
import { describe, expect, it } from "vitest";

import { iconoPorNombre } from "@/lib/iconos";

const ICONOS_DEL_MENU = [
  "i-lucide-users",
  "i-mdi:monitor",
  "material-symbols:lock-outline",
  "mdi-account",
  "mdi-account-group",
  "mdi-account-multiple",
  "mdi-badge-account",
  "mdi-beach",
  "mdi-calendar-check",
  "mdi-calendar-clock",
  "mdi-car-wrench",
  "mdi-cart",
  "mdi-cash-register",
  "mdi-chemical-weapon",
  "mdi-clipboard-list",
  "mdi-clipboard-text",
  "mdi-cog",
  "mdi-domain",
  "mdi-file-document",
  "mdi-file-document-edit",
  "mdi-file-document-outline",
  "mdi-file-sign",
  "mdi-food",
  "mdi-package-variant-closed",
  "mdi-palette",
  "mdi-ruler",
  "mdi-security",
  "mdi-shape",
  "mdi-silverware-fork-knife",
  "mdi-store",
  "mdi-tools",
  "mdi-transfer",
  "mdi-truck",
  "mdi-view-comfy",
  "mdi-view-dashboard",
  "mdi-view-module",
  "mdi-cog-outline",
  "mdi-bookshelf",
  "mdi-clock-outline",
  "mdi-export",
  "mdi-warehouse",
  "mdi-finance",
  "mdi-format-list-numbered",
  "mdi-calendar-range",
  "mdi-file-document-multiple",
  "mdi-cash-plus",
  "mdi-cash-minus",
  "mdi-chart-donut",
  "mdi-bank",
  "mdi-tag-multiple",
  "mdi-cash-clock",
  "mdi-account-cash",
];

describe("iconoPorNombre", () => {
  it("resuelve iconos conocidos de Material Design", () => {
    expect(iconoPorNombre("mdi-package-variant")).toBe(Package);
    expect(iconoPorNombre("mdi-cog")).toBe(Settings);
    expect(iconoPorNombre("mdi-cog-outline")).toBe(Settings);
    expect(iconoPorNombre("mdi-bookshelf")).toBe(LibraryBig);
  });

  it("resuelve todos los iconos que usa el menú del backend", () => {
    const sinIcono = ICONOS_DEL_MENU.filter(
      (nombre) => iconoPorNombre(nombre) === Circle,
    );
    expect(sinIcono).toEqual([]);
  });

  it("usa un icono de respaldo para nombres desconocidos", () => {
    expect(iconoPorNombre("mdi-no-existe")).toBe(Circle);
    expect(iconoPorNombre(undefined)).toBe(Circle);
  });
});
