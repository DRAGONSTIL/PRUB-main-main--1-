# ATLAS ATS SaaS (multi-tenant)

Plataforma ATS multi-tenant construida con Next.js App Router + React + TypeScript + Prisma + Postgres + NextAuth + Tailwind/shadcn.

## Requisitos

- Node.js 20+
- npm 10+
- Postgres 14+

## Variables de entorno

Crear `.env` con:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/atlas"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me"

# Opcional OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Demo mode
DEMO_MODE="true"

# Storage (S3 compatible)
S3_REGION="us-east-1"
S3_BUCKET="atlas-docs"
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

# Rate limit redis (opcional)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

## Instalación

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Scripts de calidad (obligatorios)

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm run build
npm run start
```

## Seguridad multi-tenant

- Capa central en `src/lib/api-security.ts`:
  - `requireSession()`
  - `requireRole([...])`
  - `requireTenantScope({...})`
  - `safeErrorResponse()`
- Matriz de endpoints: `EndpointMatrix.md`.

## Migraciones y backups

- Migraciones: `npm run db:migrate`
- Reset local: `npm run db:reset`
- Recomendado en producción:
  - respaldos automáticos diarios de Postgres
  - restauración probada por ambiente
  - estrategia de rollback de migraciones

## Estado de auditoría

- Hallazgos y plan: `Audit.md`


## Operación de email async (Fase 5)

- `POST /api/emails` encola trabajo y responde `202`.
- Reintentos automáticos con backoff exponencial (máx 3).
- Dead-letter en memoria para jobs que agotan reintentos.
- `GET /api/emails` expone estado de cola (`pending`, `deadLetter`).

> Nota: implementación actual es **stub en memoria**. Para producción estricta migrar a cola durable (BullMQ/Redis, Cloud Tasks o SQS).

## Observabilidad (Fase 6)

- Middleware agrega/propaga `x-request-id`.
- Logs estructurados JSON en `src/lib/logger.ts`.
- Healthcheck: `GET /api/health` (incluye verificación DB).



## Docker (despliegue reproducible)

```bash
docker compose up --build
```

Servicios:
- `app`: Next.js standalone en `:3000`
- `db`: Postgres 16 en `:5432`

Healthcheck:
- `GET http://localhost:3000/api/health`


## Import CSV robusto (Fase 3)

`POST /api/candidatos/import` ahora soporta dos modos:

- JSON legado: `{ "candidatos": [...] }`
- CSV directo: `{ "csv": "..." }`

Características:
- Soporta delimitadores `,` y `;`.
- Soporta comillas escapadas y comas dentro de texto.
- Devuelve preview + errores por fila (`422`) en caso de validación fallida.
- Dedupe por email dentro del tenant (empresa/equipo scope).
