FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx turbo run build --filter=@code-duel/server

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist

RUN npm install --production
RUN npx prisma generate --schema=apps/server/prisma/schema.prisma
CMD ["node", "apps/server/dist/index.js"]
