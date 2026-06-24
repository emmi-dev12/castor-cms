FROM node:20-slim AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/editor/package.json apps/editor/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/types/ packages/types/
COPY apps/editor/ apps/editor/
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter editor build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/editor/.next/standalone ./
COPY --from=build /app/apps/editor/.next/static ./apps/editor/.next/static
COPY --from=build /app/apps/editor/public ./apps/editor/public 2>/dev/null || true
EXPOSE 3001
CMD ["node", "apps/editor/server.js"]
