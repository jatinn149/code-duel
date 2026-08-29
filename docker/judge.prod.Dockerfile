# Build Stage
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npm ci
RUN npx turbo run build --filter=@code-duel/judge

# Runner Stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache docker-cli

# Copy essential files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/services/judge/dist ./services/judge/dist
COPY --from=builder /app/services/judge/package.json ./services/judge/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/packages/validation/package.json ./packages/validation/package.json

# Install production dependencies only
RUN npm ci --production --ignore-scripts

# No USER directive, run as root to access docker socket

EXPOSE 3002
CMD ["node", "services/judge/dist/index.js"]
