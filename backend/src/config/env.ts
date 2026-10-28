import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  UPLOAD_TOKEN_SECRET: z.string().min(32, 'UPLOAD_TOKEN_SECRET must be at least 32 chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),
  MAX_FAILED_LOGINS: z.coerce.number().default(5),
  LOCKOUT_MINUTES: z.coerce.number().default(15),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().default(0),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(25),
  SEED_PASSWORD: z.string().optional(),
  POSTGRES_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const i of parsed.error.issues) console.error(` - ${i.path.join('.')}: ${i.message}`);
  console.error('Run `npm run setup:env` in backend/ to generate a .env file.');
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
