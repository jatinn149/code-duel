# Code Duel Infrastructure Guidance

## Local Development Startup

To start the local development environment correctly, you must ensure the Redis infrastructure is running.

### 1. Start Infrastructure
Run the following command to start Redis via Docker:
```bash
npm run infra
```
This script will:
- Start the Redis container.
- Wait for the healthcheck to pass.
- Verify host connectivity to `127.0.0.1:6379`.

### 2. Start Services
Once infrastructure is ready, start the application:
```bash
npm run dev
```

## Redis Configuration

- **Host**: Always use `127.0.0.1` for local connections to avoid Windows IPv6 resolution issues with `localhost`.
- **Environment Variables**:
  - `REDIS_URL`: Full connection string (e.g., `redis://127.0.0.1:6379`).
  - `REDIS_HOST`: Hostname (default: `127.0.0.1`).
  - `REDIS_PORT`: Port (default: `6379`).

## Troubleshooting

### Redis Connection Refused
If you see `ECONNREFUSED 127.0.0.1:6379`:
1. Check if the container is running: `docker ps`.
2. Ensure no other service is using port `6379`.
3. Run `npm run infra` again.

### Docker Pull Errors
If `docker compose up` fails with registry errors, try pulling the image manually:
```bash
docker pull redis:7-alpine
```
