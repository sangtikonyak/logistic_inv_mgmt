import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().min(1).optional(),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('inventory'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  REFRESH_SECRET: z.string().min(32, 'REFRESH_SECRET must be at least 32 characters long'),
  REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsedEnv.data;
