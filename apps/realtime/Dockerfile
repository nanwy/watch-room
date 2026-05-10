# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/realtime/package.json apps/realtime/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @workspace/db prisma generate
RUN pnpm --filter realtime build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4001
CMD ["pnpm", "--filter", "realtime", "start"]
