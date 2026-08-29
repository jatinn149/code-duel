const { execSync } = require('child_process');
const net = require('net');

async function checkRedis() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(1000);
    client
      .connect(6379, '127.0.0.1', () => {
        client.end();
        resolve(true);
      })
      .on('error', () => {
        client.destroy();
        resolve(false);
      })
      .on('timeout', () => {
        client.destroy();
        resolve(false);
      });
  });
}

async function checkPostgres() {
  try {
    // 1. Verify PostgreSQL is accepting connections
    // 2. Verify database 'code_duel_db' exists
    // 3. Verify user 'code_duel' credentials are valid
    execSync(
      'docker compose exec -T postgres psql -U code_duel -d code_duel_db -c "SELECT 1;"',
      { stdio: 'ignore' }
    );
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log('🚀 Code Duel: Starting infrastructure...');

  try {
    console.log('📦 Provisioning containers (Redis, PostgreSQL)...');
    execSync('docker compose up -d redis postgres', { stdio: 'inherit' });

    console.log('⏳ Waiting for infrastructure to be ready (max 30s)...');
    
    let redisReady = false;
    let postgresReady = false;
    const maxAttempts = 15;
    const delayMs = 2000;

    for (let i = 1; i <= maxAttempts; i++) {
      if (!redisReady) redisReady = await checkRedis();
      if (!postgresReady) postgresReady = await checkPostgres();

      if (redisReady && postgresReady) break;

      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, delayMs));
    }

    console.log('\n');

    if (redisReady) {
      console.log('✅ Redis is healthy and reachable at 127.0.0.1:6379');
    } else {
      console.error('❌ Redis failed to start or is not reachable.');
    }

    if (postgresReady) {
      console.log('✅ PostgreSQL is healthy and authenticated.');
    } else {
      console.error('❌ PostgreSQL failed to start or authentication failed.');
    }

    if (redisReady && postgresReady) {
      console.log('\n🎉 Infrastructure is ready!');
    } else {
      console.error('\n❌ Infrastructure failed to reach a healthy state.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to start infrastructure:', err.message);
    process.exit(1);
  }
}

run();
