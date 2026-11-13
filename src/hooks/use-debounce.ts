"use client";

import { useEffect, useState } from "react";

export function useDebounce<T>(valor: T, retraso = 350) {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDebounced(valor), retraso);
    return () => clearTimeout(temporizador);
  }, [valor, retraso]);

  return debounced;
}
