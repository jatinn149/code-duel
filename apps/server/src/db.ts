import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import path from 'path';
import { execSync } from 'child_process';
import { logger } from './utils/logger';

let prismaInstance: PrismaClient | null = null;
let poolInstance: pg.Pool | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    let connectionLimit: number | undefined;
    let poolTimeout: number | undefined;
    try {
      const parsedUrl = new URL(connectionString);
      const limitStr = parsedUrl.searchParams.get('connection_limit');
      if (limitStr) connectionLimit = parseInt(limitStr, 10);
      const timeoutStr = parsedUrl.searchParams.get('pool_timeout');
      if (timeoutStr) poolTimeout = parseInt(timeoutStr, 10);
    } catch {
      // Ignore URL parsing errors and fallback to defaults/env variables
    }

    const maxConnections = parseInt(process.env.DB_POOL_MAX || '', 10) 
      || connectionLimit 
      || 10;

    const connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '', 10)
      || (poolTimeout ? poolTimeout * 1000 : 5000);

    const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '10000', 10);

    logger.info({ maxConnections, connectionTimeout, idleTimeout }, 'Configuring pg.Pool database pool parameters');

    const pool = new pg.Pool({ 
      connectionString,
      max: maxConnections,
      connectionTimeoutMillis: connectionTimeout,
      idleTimeoutMillis: idleTimeout,
    });
    poolInstance = pool;
    const adapter = new PrismaPg(pool);

    // Prevent connection exhaustion by limiting pool size.
    // Recommended pool size = (CPU Cores * 2) + 1. For a standard 4-core worker: 9
    // We apply this via the DATABASE_URL connection string in .env: ?connection_limit=10&pool_timeout=10
    prismaInstance = new PrismaClient({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    (prismaInstance as any).$on('query', (e: any) => {
      // Query Budgeting / Monitoring
      // Warn if a query takes longer than 100ms
      if (e.duration > 100) {
         logger.warn({
           query: e.query,
           params: e.params,
           durationMs: e.duration
         }, 'SLOW QUERY DETECTED');
      } else {
         logger.debug({
           query: e.query,
           durationMs: e.duration
         }, 'Prisma Query');
      }
    });

    (prismaInstance as any).$on('error', (e: any) => {
      logger.error({ error: e.message, target: e.target }, 'Prisma Error');
    });

    (prismaInstance as any).$on('warn', (e: any) => {
      logger.warn({ warn: e.message }, 'Prisma Warning');
    });
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = getPrisma();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

export async function initializeAndValidateDb(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: DATABASE_URL is not set in production environment! Database connections will fail.');
      throw new Error('DATABASE_URL is not set in production');
    }
    logger.info('PostgreSQL connection string (DATABASE_URL) not set, skipping database initialization.');
    return;
  }

  logger.info('Initializing and validating database connection...');

  // 1. Verify reachability & initialize prismaInstance
  let instance: PrismaClient;
  try {
    instance = getPrisma();
    await instance.$queryRawUnsafe('SELECT 1');
    logger.info('Database connection established and verified successfully.');
  } catch (error: any) {
    logger.error({ error: error.message }, 'FATAL: Database connection failed. Database is unreachable.');
    throw new Error(`Database connection failed: ${error.message}`);
  }

  // 2. Deploy migrations idempotently
  logger.info('Deploying/verifying database migrations...');
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const stdout = execSync('npx prisma migrate deploy', {
      cwd: projectRoot,
      env: { ...process.env },
      stdio: 'pipe',
    });
    logger.info(`Migrations checked/applied successfully:\n${stdout.toString()}`);
  } catch (migrateError: any) {
    const stderr = migrateError.stderr?.toString() || migrateError.message;
    logger.error({ error: migrateError.message, stderr }, 'FATAL: Database migration deployment failed.');
    throw new Error(`Failed to apply database migrations: ${stderr}`);
  }

  // 2b. Automatically run seeding script if the database is empty of problems (Self-Healing)
  try {
    const problemCount = await instance.problem.count();
    if (problemCount === 0) {
      logger.info('Database has 0 problems. Running database seed...');
      const projectRoot = path.resolve(__dirname, '..');
      const seedStdout = execSync('npx prisma db seed', {
        cwd: projectRoot,
        env: { ...process.env },
        stdio: 'pipe',
      });
      logger.info(`Database seeded successfully:\n${seedStdout.toString()}`);
    }
  } catch (seedErr: any) {
    const seedStderr = seedErr.stderr?.toString() || seedErr.message;
    logger.error({ error: seedErr.message, stderr: seedStderr }, 'Failed to run database seeding automatically.');
  }

  // 3. Verify that critical tables exist
  try {
    const tables: Array<{ table_name: string }> = await instance.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const existingTables = new Set(tables.map(t => t.table_name.toLowerCase()));
    const requiredTables = ['user', 'problem', 'problemhistory', 'matchresult', 'matchplayerresult', 'session'];
    const missingTables = requiredTables.filter(t => !existingTables.has(t));

    if (missingTables.length > 0) {
      const errMsg = `FATAL: Database verification failed. Missing critical tables: ${missingTables.join(', ')}`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
    logger.info('Database schema validation succeeded. All critical tables exist.');

    // 4. Self-healing: Repair any legacy negative streaks in the database
    try {
      await instance.$executeRawUnsafe(`
        UPDATE "User" 
        SET "streak" = 0 
        WHERE "streak" < 0;
      `);
      await instance.$executeRawUnsafe(`
        UPDATE "User" 
        SET "highestStreak" = 0 
        WHERE "highestStreak" < 0;
      `);
      logger.info('Database self-healing: sanitized legacy negative streaks to 0');
    } catch (e: any) {
      logger.warn({ err: e.message }, 'Self-healing streak sanitize skipped or failed');
    }
  } catch (validationError: any) {
    logger.error({ error: validationError.message }, 'FATAL: Database schema validation failed.');
    throw validationError;
  }
}

export async function shutdownDb() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}