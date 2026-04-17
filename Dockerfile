## Multi-stage Dockerfile for the Skills4CRM API server.
##
## Build with:   docker build -t skills4crm-api .
## Run with:     docker run -p 8080:8080 \
##                 -e PORT=8080 \
##                 -e NODE_ENV=production \
##                 -e DATABASE_URL=postgres://... \
##                 -e JWT_SECRET=<strong-secret> \
##                 skills4crm-api
##
## Azure: deploy this image to Azure App Service for Containers, or push to
## Azure Container Registry and reference it from a Web App / Container App.

# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib ./lib

RUN pnpm install --frozen-lockfile

COPY artifacts/api-server ./artifacts/api-server

RUN pnpm --filter @workspace/api-server run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/api-server/package.json ./package.json

EXPOSE 8080

# Healthcheck hits the API healthz endpoint; useful for App Service / K8s probes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT}/api/healthz || exit 1

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
