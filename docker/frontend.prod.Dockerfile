# Build Stage
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npm ci
RUN npx turbo run build --filter=@code-duel/client

# Runner Stage
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
