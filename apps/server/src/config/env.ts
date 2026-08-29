import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters in production'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters in production'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const { fieldErrors } = parsed.error.flatten();
  console.error('❌ CRITICAL: Invalid environment configuration:');
  Object.entries(fieldErrors).forEach(([field, errors]) => {
    console.error(`  - ${field}: ${errors?.join(', ')}`);
  });
  process.exit(1);
}

export const env = parsed.data;
