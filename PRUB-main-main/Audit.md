# Audit de producción (avance Fases 1-6)

## P0 cerrados

1. Build ignora TypeScript (resuelto).
2. React strict mode desactivado (resuelto).
3. Seguridad API no centralizada (resuelto para endpoints críticos).
4. Seed endpoint expuesto (resuelto).

## P1 implementados

- Hardening adicional en endpoints legacy de `usuarios`, `notas`, `equipos`, `entrevistas` y `actividades` con capa central + tenant checks.

1. Búsqueda global real en command palette con endpoint server-side.
2. Guard de cambios no guardados en modal candidato.
3. Import CSV robusto con parsing de comillas/comas y delimitador `;`, más validación por fila y preview de errores.
4. Reportes con validación de `vacanteId` bajo tenant scope.
5. Sync con contrato versionado (`v1`), dedupe reportado y `sourceOfTruth` explícito (`db`).
6. Emails async con cola + retry + dead-letter (stub).
7. Observabilidad base: logger JSON, `x-request-id`, `/api/health`.
8. Despliegue reproducible: `Dockerfile` + `docker-compose.yml`.

## Riesgos abiertos

1. Cola de emails in-memory no durable (migrar a BullMQ/Cloud Tasks/SQS).
2. Aislamiento tenant no unificado en 100% de endpoints legacy.
3. `src/app/page.tsx` sigue monolítico.
4. Sin tracing distribuido (Sentry/OTEL pendiente).

## Criterios medibles validados

- `lint` ✅
- `typecheck` ✅
- `test` ✅
- `build` ✅
