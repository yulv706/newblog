FROM public.ecr.aws/docker/library/node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS builder

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN node scripts/run-migrations.js
RUN npm run build

FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm install --omit=dev && npm install --no-save typescript && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
RUN printf '%s\n' '/** @type {import(\"next\").NextConfig} */' 'const nextConfig = {};' '' 'export default nextConfig;' > next.config.mjs \
  && rm next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

RUN mkdir -p data public/uploads/images

EXPOSE 3000

CMD ["sh", "-c", "node scripts/run-migrations.js && npm run start"]
