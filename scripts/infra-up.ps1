# scripts/infra-up.ps1
# Senior DevOps script to stabilize local development infrastructure

Write-Host "🚀 Code Duel: Starting infrastructure..." -ForegroundColor Cyan

# 1. Ensure Docker is running
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# 2. Start Redis and other infra from docker-compose
Write-Host "📦 Starting Redis container..." -ForegroundColor Yellow
docker compose up -d redis

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to start Redis container."
    exit 1
}

# 3. Wait for Redis to be healthy
Write-Host "⏳ Waiting for Redis healthcheck..." -ForegroundColor Yellow
$timeout = 30
$elapsed = 0
while ($elapsed -lt $timeout) {
    $status = docker inspect --format='{{.State.Health.Status}}' (docker compose ps -q redis)
    if ($status -eq "healthy") {
        Write-Host "✅ Redis is healthy!" -ForegroundColor Green
        break
    }
    Write-Host "..." -NoNewline
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if ($elapsed -ge $timeout) {
    Write-Warning "⚠️ Redis healthcheck timed out, but continuing anyway. It might still be starting."
}

# 4. Verify connectivity from host
Write-Host "🔍 Verifying connectivity from host..." -ForegroundColor Yellow
# Try to use a simple tcp check since redis-cli might not be in host path
$tcpClient = New-Object System.Net.Sockets.TcpClient
try {
    $tcpClient.Connect("127.0.0.1", 6379)
    Write-Host "✅ Host can reach Redis at 127.0.0.1:6379" -ForegroundColor Green
    $tcpClient.Close()
} catch {
    Write-Error "❌ Host CANNOT reach Redis at 127.0.0.1:6379. Check for port conflicts or firewall rules."
    $tcpClient.Close()
    exit 1
}

Write-Host "🎉 Infrastructure is ready! You can now run 'npm run dev'." -ForegroundColor Cyan
