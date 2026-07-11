# syntax=docker/dockerfile:1
# Build from the repository root:
#   docker build -f spanner-app/Dockerfile .
#   gcloud run deploy ... --source . --dockerfile spanner-app/Dockerfile

FROM node:20-alpine AS deps
WORKDIR /app/spanner-app
COPY spanner-app/package.json spanner-app/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/spanner-app/node_modules ./spanner-app/node_modules
COPY shared ./shared
COPY spanner-app ./spanner-app
# Shared UI lives outside spanner-app; hoist deps so TS/bundler can resolve them.
RUN mkdir -p /app/node_modules \
  && ln -s /app/spanner-app/node_modules/react /app/node_modules/react \
  && ln -s /app/spanner-app/node_modules/react-dom /app/node_modules/react-dom \
  && ln -s /app/spanner-app/node_modules/@types /app/node_modules/@types \
  && ln -s /app/spanner-app/node_modules/three /app/node_modules/three
WORKDIR /app/spanner-app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/spanner-app/public ./spanner-app/public
COPY --from=builder --chown=nextjs:nodejs /app/spanner-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/spanner-app/.next/static ./spanner-app/.next/static

USER nextjs

ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

CMD ["node", "spanner-app/server.js"]
