# Multi-stage build for the @ctf/api workspace.
# Build context = monorepo root.
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
# Workspace manifests first so `npm ci` resolves the ENTIRE monorepo's deps.
COPY package.json package-lock.json turbo.json tsconfig.base.json eslint.config.js ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
ENV DATABASE_URL=postgresql://ctf:ctf@postgres:5432/ctf_dev
RUN npm ci

# Full source tree.
COPY apps ./apps
COPY packages ./packages

RUN npm run db:generate --workspace @ctf/database
# `--` separator is required so npm forwards the turbo filter.
RUN npm run build -- --filter=@ctf/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages/database/package.json ./packages/database/package.json
COPY --from=build /repo/packages/database/prisma ./packages/database/prisma
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]