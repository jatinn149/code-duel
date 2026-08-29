const pg = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log('DATABASE_URL:', connectionString);

async function testPg() {
  console.log('\n--- Testing pg Pool ---');
  const pool = new pg.Pool({ connectionString });
  try {
    const res = await pool.query('SELECT 1 as val');
    console.log('pg Pool success:', res.rows);
  } catch (err) {
    console.error('pg Pool error:', err.message);
  } finally {
    await pool.end();
  }
}

async function testPrismaNative() {
  console.log('\n--- Testing Prisma Client (Native Engine) ---');
  const prisma = new PrismaClient({
    datasourceUrl: connectionString,
  });
  try {
    const res = await prisma.$queryRawUnsafe('SELECT 1 as val');
    console.log('Prisma Native success:', res);
  } catch (err) {
    console.error('Prisma Native error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testPrismaAdapter() {
  console.log('\n--- Testing Prisma Client (Adapter-PG) ---');
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const res = await prisma.$queryRawUnsafe('SELECT 1 as val');
    console.log('Prisma Adapter success:', res);
  } catch (err) {
    console.error('Prisma Adapter error:', err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  await testPg();
  await testPrismaAdapter();
}

main().catch(console.error);
