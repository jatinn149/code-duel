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
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 judgejs

# Copy essential files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/services/judge/dist ./services/judge/dist
COPY --from=builder /app/services/judge/package.json ./services/judge/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist

# Install production dependencies only
RUN npm ci --production --ignore-scripts

USER judgejs

EXPOSE 3002
CMD ["node", "services/judge/dist/index.js"]
