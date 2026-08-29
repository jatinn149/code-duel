FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx turbo run build --filter=@code-duel/judge

FROM node:18-alpine
WORKDIR /app
# Install Docker CLI to allow the judge to interact with the host Docker daemon
RUN apk add --no-cache docker-cli

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/services/judge/dist ./services/judge/dist
COPY --from=builder /app/services/judge/package.json ./services/judge/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist

RUN npm install --production
CMD ["node", "services/judge/dist/index.js"]
