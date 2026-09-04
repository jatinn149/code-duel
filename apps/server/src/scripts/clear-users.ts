import 'dotenv/config';
import net from 'net';
import { jsonStorage } from '@/storage/json-adapter';
import { JsonUserRepository } from '@/repositories/json-user-repository';
import { PgUserRepository } from '@/repositories/pg-user-repository';
import { clearUserDatabase } from '@/services/admin-service';

async function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket
      .connect(port, host, () => {
        socket.end();
        resolve(true);
      })
      .on('error', () => {
        socket.destroy();
        resolve(false);
      })
      .on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
  });
}

async function main() {
  console.log('🧹 [CodeDuel] Purging user database...');
  await jsonStorage.initialize();

  const isPostgresRunning = await isPortOpen(5432, '127.0.0.1');
  const isPgEnabled = !!process.env.DATABASE_URL && isPostgresRunning;

  if (isPgEnabled) {
    console.log('📡 Connected to PostgreSQL (127.0.0.1:5432). Purging database tables...');
  } else {
    console.log('📁 PostgreSQL is offline/disabled. Purging JSON storage database...');
  }

  const userRepository = isPgEnabled ? new PgUserRepository() : new JsonUserRepository(jsonStorage);
  const result = await clearUserDatabase(userRepository, { keepAdmin: false });

  console.log(`\n✅ ${result.message} (${result.deletedUsersCount} users cleared)`);
  console.log('==============================================');
  console.log('👑 SUPER ADMIN ACCOUNT CREDENTIALS');
  console.log('==============================================');
  console.log('   Username: admin');
  console.log('   Email:    admin@codeduel.io');
  console.log('   Password: Admin@123456');
  console.log('   Role:     ADMIN');
  console.log('   Rating:   2500 CP (Apex Grandmaster)');
  console.log('==============================================');
  console.log('✨ System is completely clean and ready!\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error clearing user database:', err);
  process.exit(1);
});
