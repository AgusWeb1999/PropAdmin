FROM node:20-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Build
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 apiuser

COPY --from=deps --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=apiuser:nodejs /app/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/src/prisma ./src/prisma
COPY --chown=apiuser:nodejs package.json ./

RUN mkdir -p uploads && chown apiuser:nodejs uploads
USER apiuser

EXPOSE 4000
# La detección automática de OpenSSL de Prisma está rota en Alpine moderno
# (asume 1.1.x, que ya no existe; node:20-alpine solo trae 3.x). Forzamos
# el motor correcto según arquitectura en vez de dejar que la adivine.
CMD ["sh", "-c", "if [ \"$(uname -m)\" = aarch64 ]; then export PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node; else export PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node; fi; exec node dist/server.js"]
