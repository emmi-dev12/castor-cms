FROM node:20-slim AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/types/ packages/types/
COPY apps/api/ apps/api/
RUN pnpm --filter types build
RUN pnpm --filter api build

FROM node:20-slim AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./

RUN mkdir -p data
EXPOSE 3000
CMD ["node", "dist/index.js"]
