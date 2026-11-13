# ERP · Frontend

Interfaz del ERP construida con **Next.js 16 (App Router)**, **shadcn/ui** y
**Tailwind CSS 4**, con un **BFF** que mantiene los tokens fuera del navegador.

## Requisitos

- Node.js 20.9 o superior (probado con Node 22)
- pnpm 12 (`corepack enable` o `npm i -g pnpm`)
- Backend NestJS disponible en `http://localhost:9000/api`

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # ajusta API_INTERNAL_URL si hace falta
pnpm dev
```

Abre <http://localhost:3001>.

> El frontend usa el puerto **3001** para no chocar con Docker/WSL, que suele
> ocupar el 3000. El backend usa el puerto **9000**.

Credenciales de la semilla de desarrollo: `admin` / `1234`.

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Compilación de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm test` | Pruebas unitarias (Vitest) |
| `pnpm test:e2e` | E2E + accesibilidad (Playwright) |

### Pruebas

- **Unitarias** (`src/**/*.test.ts`): permisos/menú, formato de moneda y fechas,
  resolución de iconos.
- **E2E** (`e2e/`): login, logout, protección de rutas, navegación a Productos,
  Proveedores, Permisos y Chat, y auditoría con `axe-core` en login, dashboard y
  productos.
- Las E2E requieren el backend levantado. Playwright reutiliza el dev server en
  `http://localhost:3001` o lo inicia si no existe.

## Variables de entorno

| Variable | Ámbito | Descripción |
|---|---|---|
| `API_INTERNAL_URL` | Solo servidor | URL interna del backend, p. ej. `http://localhost:9000/api`. Nunca se expone al navegador. |
| `NEXT_PUBLIC_SOCKET_URL` | Navegador | Origen del backend para el WebSocket del chat, p. ej. `http://localhost:9000`. |

## Arquitectura de autenticación (BFF)

```
Navegador ──/api/*──▶ Next.js (Route Handlers) ──Bearer──▶ NestJS
      ▲                        │
      └── cookie HttpOnly ─────┘  (erp_sesion)
```

- El login llama a `POST /api/auth/login`. El BFF guarda `token` y
  `refreshToken` en una cookie **HttpOnly** codificada en base64url
  (`erp_sesion`). El JavaScript del navegador **nunca** ve el JWT.
- Todas las llamadas de datos pasan por `/api/proxy/*`, que añade el
  `Authorization: Bearer`, renueva la sesión ante un `401` y reintenta una vez.
- La renovación está deduplicada en el servidor porque el refresh token rota.
- `src/proxy.ts` (el antiguo `middleware`) redirige a `/login` cuando no hay
  cookie de sesión y evita que un usuario autenticado vuelva al login.
- El perfil y el árbol de permisos se cachean en `localStorage` (no son
  secretos) para reconstruir el menú tras recargar. La API sigue siendo la
  autoridad final de cada permiso.

### Rutas del BFF

| Ruta | Uso |
|---|---|
| `POST /api/auth/login` | Login, crea la cookie de sesión |
| `GET /api/auth/session` | Valida la cookie y devuelve el payload del JWT |
| `POST /api/auth/logout` | Elimina la cookie |
| `POST /api/auth/forgot-password` | Proxy público |
| `POST /api/auth/reset-password` | Proxy público |
| `ALL /api/proxy/[...ruta]` | Proxy autenticado al backend |
| `GET /api/media/[...ruta]` | Sirve `/uploads` del backend en el mismo origen |
| `GET /api/public/branding` | Branding público con caché de 60 s |

### Chat en tiempo real

El navegador no conoce el access token. Para el WebSocket:

1. El cliente pide `POST /api/chat/ws-ticket` (a través del BFF).
2. El backend responde un JWT efímero (60 s) con `scope: "ws"`.
3. El cliente conecta con `auth: { token }` a `NEXT_PUBLIC_SOCKET_URL`.
4. Si el socket se cae, el hook pide un ticket nuevo antes de reconectar.

Eventos usados: `chat:join`, `chat:leave`, `chat:send`, `chat:typing`, `chat:read`
(cliente) y `chat:mensaje`, `chat:typing`, `chat:leido`, `chat:joined`,
`chat:error` (servidor).

## Estructura

```
src/
├── app/
│   ├── (auth)/                 # login, recuperación y reset
│   ├── (app)/                  # shell autenticado
│   │   ├── dashboard/          # resumen y dashboard de almacén
│   │   ├── almacen/            # hub + productos
│   │   └── [...modulo]/        # placeholder de módulos pendientes
│   └── api/                    # BFF
├── components/
│   ├── ui/                     # shadcn/ui
│   ├── layout/                 # sidebar, topbar, paleta de comandos
│   ├── data-table/             # tabla reutilizable
│   ├── charts/                 # KPIs y renderer de gráficas
│   └── shared/                 # page header, empty/error state, iconos
├── hooks/
├── lib/
│   ├── auth/                   # tipos, almacenamiento y helpers de servidor
│   ├── api-client.ts           # fetch del navegador contra el BFF
│   ├── permisos.ts             # menú y evaluación de permisos
│   └── types/
├── providers/
└── proxy.ts
```

## Permisos

- El menú lateral se define en `src/lib/menu-lateral.ts` con la jerarquía de
  pantallas y su ruta de permiso cuando difiere de la URL. Cada nodo se valida
  con `puede(ruta, accion)`; el backend sigue siendo la autoridad final.
- `puede(ruta, accion)` evalúa `ver · crear · editar · eliminar · adjuntos ·
  reportes`. Un administrador (`esAdministrador`) pasa siempre.
- Activar/desactivar usa `PATCH`, por lo que depende del permiso **`editar`**.
- Ocultar un botón es solo cosmético: el backend valida cada endpoint.

## Diseño

La identidad base se generó con la skill `ui-ux-pro-max` y vive en
`design-system/erp/MASTER.md`: estilo suizo minimalista, densidad alta para
dashboard, azul de datos + ámbar para acciones destacadas y tipografía Fira
Sans / Fira Code.

`GET /branding` puede sobrescribir en runtime el color primario, la fuente y los
logos. Si el endpoint falla, la aplicación arranca con los valores por defecto.

## Alcance actual

Implementado:

- Login, recuperación y restablecimiento de contraseña.
- Shell con menú dinámico, breadcrumbs, paleta de comandos (Ctrl/Cmd + K),
  tema claro/oscuro y branding.
- **Almacén:** hub, Productos (listado paginado, búsqueda, alta/edición con
  imagen, activación/desactivación) y dashboard con KPIs y gráficas.
- **Compras:** Proveedores (CRUD) y Compras (alta con partidas, recepción y
  cancelación).
- **Ventas:** Clientes (CRUD), Cotizaciones y Ventas (alta con partidas,
  descuento por partida, vigencia y cambios de estatus).
- **RH:** Departamentos, Puestos, Empleados (con foto), Contratos, Asistencias,
  Solicitudes de permiso (aprobar/rechazar) y Vacaciones (políticas y consulta
  de saldos).
- **Mantenimiento:** Equipos, Planes, Órdenes de trabajo (transiciones de
  estatus), Refacciones y Movimientos de refacción.
- **Finanzas:** Catálogo de cuentas, Periodos, Pólizas, Reportes contables,
  Cuentas por cobrar/pagar, Cartera, Bancos, Centros de costo, Presupuestos y
  Nómina contable.
- **Configuraciones:** Usuarios (alta con perfil y foto, edición, cambio de
  contraseña, activar/desactivar), Roles, Matriz de Permisos por rol y pantalla,
  Pantallas del menú, Bitácora de accesos, Auditoría y Apariencia (colores,
  tipografía, radio y logos).
- **Catálogos:** Categorías (con subcategorías), Unidades de medida y Almacenes.
- **Comedor:** Turnos, Menús (publicación con comidas por día) y Solicitudes
  (selección de comidas del siguiente menú y cancelación).
- **Chat:** conversaciones 1:1 y grupales, mensajes en tiempo real, indicador de
  escritura, no leídos y creación de conversaciones.
- Perfil de usuario y página de “sin acceso”.

El motor `ResourcePage` permite declarar un CRUD completo (columnas, campos,
validación, mapeo de payload y rutas alternativas) en un solo archivo. Los
documentos con partidas (compras, cotizaciones y ventas) comparten
`DocumentoPage`.

Todos los módulos del backend están cubiertos por la interfaz.

> **Chat:** requiere que el backend acepte el token por
> `socket.handshake.auth.token`; hoy solo lee el header `Authorization`, que el
> navegador no puede enviar en el handshake de WebSocket.
