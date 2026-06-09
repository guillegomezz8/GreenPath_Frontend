# GreenPath Frontend

Frontend de GreenPath, una aplicacion web React para gestionar empresas de recogida de aceite usado. La interfaz consume la API Django del backend y ofrece pantallas diferenciadas para owner, worker y client, cubriendo administracion, operacion diaria, rutas, recogidas, ventas, facturacion y estadisticas.

## Indice

- [Vision general](#vision-general)
- [Stack tecnico](#stack-tecnico)
- [Funcionalidades principales](#funcionalidades-principales)
- [Roles y navegacion](#roles-y-navegacion)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Relacion con el backend](#relacion-con-el-backend)
- [Testing](#testing)
- [Documentacion](#documentacion)

## Vision general

GreenPath Frontend es la capa visual del TFG. Esta construida como una aplicacion SPA con Vite, React Router y autenticacion JWT. Su objetivo es convertir la logica del backend en flujos utilizables por perfiles reales:

- el owner administra la empresa y consulta el estado global del negocio;
- el worker ejecuta rutas y registra recogidas;
- el client responde solicitudes y consulta su informacion.

La navegacion usa `HashRouter`, lo que facilita el despliegue estatico y evita problemas de refresco en rutas internas.

## Stack tecnico

- React 19
- Vite 6
- React Router DOM 7
- Axios
- Tailwind CSS
- Radix UI
- Material UI
- Lucide React
- Leaflet / React Leaflet
- Framer Motion
- Vitest
- Testing Library
- Docker

## Funcionalidades principales

### Administracion

- Login local y login social con Google.
- Proteccion de rutas por rol.
- Dashboard con indicadores operativos.
- Gestion de perfil de usuario.
- Gestion de configuracion de empresa.

### Clientes, trabajadores y camiones

- Listados paginados y filtrables.
- Alta, detalle, edicion y borrado.
- Perfil de trabajador con foto.
- Asignacion de camiones a conductores.

### Zonas y rutas

- Visualizacion y gestion de zonas de recogida.
- Configuracion de rutas plantilla.
- Asignacion de trabajador y zonas por dia.
- Generacion semanal de rutas operativas.
- Vista de detalle de ruta.
- Pantalla de ejecucion diaria.
- Mapa de paradas con Leaflet.
- Exportacion de navegacion a Google Maps.

### Recogidas

- Listado y detalle de recogidas.
- Alta manual por owner o worker.
- Edicion y consolidacion.
- Estados de recogida: pendiente de medicion, confirmada o cancelada.
- Portal de cliente para responder solicitudes de estimacion.

### Ventas y economia

- Gestion de compradores.
- Gestion de ventas.
- Descarga de facturas PDF generadas por backend.
- Pantalla de estadisticas con costes, ingresos y beneficio.

## Roles y navegacion

La aplicacion usa rutas protegidas en `src/routes/RolesRoutes.jsx` y define la navegacion principal en `src/App.jsx`.

Rutas publicas:

- `/login`
- `/socialLogin`

Rutas comunes autenticadas:

- `/profile`
- `/perfil`

Rutas `owner`:

- `/dashboard`
- `/clients`
- `/workers`
- `/trucks`
- `/collection-zones`
- `/routes/new`
- `/routes/:id/edit`
- `/collections/:id/edit`
- `/assign-truck/:id`
- `/stats`
- `/settings`
- `/buyers`
- `/sales`

Rutas `owner` y `worker`:

- `/routes`
- `/routes/:id`
- `/routes/:id/execute`
- `/collections/new`
- `/collections/:id/new`

Rutas `owner`, `worker` y `client`:

- `/collections`
- `/collections/:id`

Rutas `client`:

- `/my-requests`

## Estructura del proyecto

```text
src/
  App.jsx                 Definicion de rutas y layout principal
  main.jsx                Punto de entrada React
  context/                AuthProvider y SnackbarProvider
  routes/                 Guards por autenticacion y rol
  components/
    common/               Componentes reutilizables de tablas, estados, PDFs, paginacion
    layout/               Sidebar, topbar y layout autenticado
    routes/               Componentes especificos de rutas y mapas
    settings/             Componentes de configuracion de empresa
    ui/                   Componentes base de interfaz
  pages/
    oauth/                Login local y social
    dashboard/            Dashboard
    clients/              Clientes
    workers/              Trabajadores
    trucks/               Camiones
    collectionZones/      Zonas de recogida
    routes/               Rutas y ejecucion
    collections/          Recogidas y solicitudes
    buyers/               Compradores
    sales/                Ventas
    stats/                Estadisticas
    settings/             Configuracion
    profile/              Perfil
    error/                Error 404
  test/                   Configuracion de tests
```

## Puesta en marcha

### Requisitos

- Node.js
- npm
- Backend GreenPath levantado en `http://localhost:8000`
- Archivo `.env` en la raiz del frontend

### Arranque local

Desde `E:\UNIVERSIDAD\TFG\GreenPath_Frontend`:

```bash
npm install
npm run dev
```

URL local:

```text
http://localhost:5173
```

### Arranque con Docker

```bash
docker-compose up --build
```

Para arrancar contenedores ya creados:

```bash
docker-compose start
```

### Arranque conjunto con backend y ngrok

El lanzador del escritorio arranca backend, frontend y tunel ngrok:

```text
C:\Users\usuario\OneDrive\Escritorio\start_greenpath.bat
```

URLs esperadas:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Backend por ngrok: `https://epic-supreme-panther.ngrok-free.app`

## Variables de entorno

Variables usadas por el frontend:

```env
VITE_APP_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_SIGNATURE=
```

Notas:

- `VITE_APP_API_URL` debe apuntar al backend. Si se usa ngrok, debe apuntar al dominio publico de ngrok.
- `VITE_GOOGLE_CLIENT_ID` debe coincidir con la configuracion permitida en backend.
- `VITE_GOOGLE_SIGNATURE` se usa en el flujo de login social si esta configurado.
- En Vite, las variables disponibles en cliente deben empezar por `VITE_`.

## Scripts disponibles

```bash
npm run dev
```

Levanta Vite en modo desarrollo.

```bash
npm run build
```

Genera la version de produccion en `dist/`.

```bash
npm run preview
```

Sirve localmente el build de produccion.

```bash
npm run lint
```

Ejecuta ESLint.

```bash
npm test
```

Ejecuta la suite de tests con Vitest.

```bash
npm run test:watch
```

Ejecuta Vitest en modo watch.

## Relacion con el backend

El frontend consume la API mediante el cliente Axios configurado en `src/context/AuthProvider.jsx`. La autenticacion se basa en tokens JWT:

- access token para peticiones autenticadas;
- refresh token para renovacion;
- interceptor de Axios para adjuntar credenciales y refrescar sesion.

Endpoints usados con frecuencia:

- `/login/`
- `/token/refresh/`
- `/authenticate/login`
- `/users/profile/`
- `/clients/`
- `/workers/`
- `/trucks/`
- `/zones/`
- `/routes/`
- `/collections/`
- `/companies/settings/`
- `/buyers/`
- `/sales/`

Las descargas de factura se hacen como `blob` desde backend y usan la cabecera `Content-Disposition` expuesta por CORS.

## Testing

El proyecto incluye tests de componentes y paginas con Vitest y Testing Library, por ejemplo:

- Login
- Perfil
- Clientes
- Trabajadores
- Camiones
- Recogidas
- Rutas
- Compradores
- Ventas
- Estadisticas
- Configuracion de empresa

Ejecutar toda la suite:

```bash
npm test
```

Ejecutar un test concreto:

```bash
npm test -- src/pages/stats/__tests__/Stats.test.jsx
```

## Documentacion

La documentacion funcional y tecnica del proyecto se centraliza en el backend:

```text
E:\UNIVERSIDAD\TFG\GreenPath_Backend\docs\INDICE_DOCUMENTACION.md
```

Documentos recomendados:

- `E:\UNIVERSIDAD\TFG\GreenPath_Backend\docs\FUNCIONAL.md`
- `E:\UNIVERSIDAD\TFG\GreenPath_Backend\docs\FRONTEND_PANTALLAS.md`
- `E:\UNIVERSIDAD\TFG\GreenPath_Backend\docs\API.md`
- `E:\UNIVERSIDAD\TFG\GreenPath_Backend\docs\ROUTE_FLOW.md`
- `E:\UNIVERSIDAD\TFG\GreenPath_Backend\docs\TESTING.md`

El README del frontend resume la parte operativa del cliente web. La memoria funcional, requisitos, arquitectura, casos de uso e integraciones se mantienen en `docs/` para evitar documentacion duplicada entre repositorios.
