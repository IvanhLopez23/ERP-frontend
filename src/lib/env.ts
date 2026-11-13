/**
 * Configuración del servidor (BFF).
 *
 * `API_INTERNAL_URL` nunca se expone al navegador: el cliente solo habla con
 * las rutas `/api/*` de este mismo proyecto.
 */
export const API_INTERNAL_URL = (
  process.env.API_INTERNAL_URL ?? "http://localhost:9000/api"
).replace(/\/+$/, "");

/** Origen del backend, usado para resolver archivos de `/uploads`. */
export const API_ORIGIN = (() => {
  try {
    return new URL(API_INTERNAL_URL).origin;
  } catch {
    return "http://localhost:9000";
  }
})();
