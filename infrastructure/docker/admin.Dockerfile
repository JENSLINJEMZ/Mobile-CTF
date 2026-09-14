# Multi-stage build for the @ctf/admin workspace (Vite SPA).
# Build context = monorepo root.
FROM node:22-bookworm-slim AS build
WORKDIR /repo

# Workspace manifests first so `npm ci` resolves the ENTIRE monorepo's deps.
COPY package.json package-lock.json turbo.json tsconfig.base.json eslint.config.js ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/toolkit/package.json ./packages/toolkit/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
ENV DATABASE_URL=postgresql://ctf:ctf@postgres:5432/ctf_dev
RUN npm ci

# Full source tree (root .dockerignore prunes node_modules/dist/etc.).
COPY apps ./apps
COPY packages ./packages

RUN npm run build -- --filter=@ctf/admin

FROM nginx:alpine AS runtime
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
COPY --from=build /repo/apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]