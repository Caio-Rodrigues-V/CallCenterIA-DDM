import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const candidates = [backendEnvPath, rootEnvPath];

for (const envFile of candidates) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const missingVars = requiredVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  const checkedFiles = candidates.join(', ');

  throw new Error(
    `Missing required env vars: ${missingVars.join(', ')}. ` +
      `Preencha esses valores em .env (raiz do projeto ou backend/.env). ` +
      `Arquivos verificados: ${checkedFiles}`
  );
}

function required(name: (typeof requiredVars)[number]): string {
  return process.env[name]!;
}

function nonNegativeInt(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Variavel ${name} invalida. Esperado inteiro nao negativo.`);
  }

  return parsed;
}

function isLikelyJwt(value: string): boolean {
  return value.startsWith('eyJ') && value.split('.').length === 3;
}

function isLikelySupabaseSecret(value: string): boolean {
  return value.startsWith('sb_secret_');
}

function isLikelySupabasePublishable(value: string): boolean {
  return value.startsWith('sb_publishable_');
}

function assertValidSupabaseKey(name: string, value: string, expected: 'service' | 'anon') {
  const isAccepted =
    isLikelyJwt(value) ||
    (expected === 'service' ? isLikelySupabaseSecret(value) : isLikelySupabasePublishable(value));

  if (isAccepted) return;

  const expectedDescription =
    expected === 'service'
      ? 'uma service role JWT (eyJ...) ou secret key (sb_secret_...)'
      : 'uma anon JWT (eyJ...) ou publishable key (sb_publishable_...)';

  throw new Error(
    `Variavel ${name} invalida. Esperado ${expectedDescription}. ` +
      `Valor atual parece estar em formato incorreto para a API do Supabase.`
  );
}

assertValidSupabaseKey('SUPABASE_SERVICE_ROLE_KEY', required('SUPABASE_SERVICE_ROLE_KEY'), 'service');

if (process.env.SUPABASE_ANON_KEY) {
  assertValidSupabaseKey('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY, 'anon');
}

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`,
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  redisUrl: process.env.REDIS_URL || '',
  rabbitmqUrl: process.env.RABBITMQ_URL || '',
  rabbitmqCallDispatchQueue: process.env.RABBITMQ_CALL_DISPATCH_QUEUE || 'call.dispatch',
  rabbitmqPrefetch: Math.max(1, nonNegativeInt('RABBITMQ_PREFETCH', 6)),
  campaignStartMaxConcurrency: Math.max(1, nonNegativeInt('CAMPAIGN_START_MAX_CONCURRENCY', 6)),
  campaignStartBatchSize: Math.max(1, nonNegativeInt('CAMPAIGN_START_BATCH_SIZE', 500)),
  campaignStartPauseMs: nonNegativeInt('CAMPAIGN_START_PAUSE_MS', 90000),
  campaignStartRequestIntervalMs: nonNegativeInt('CAMPAIGN_START_REQUEST_INTERVAL_MS', 250),
  campaignStartMaxRetries: nonNegativeInt('CAMPAIGN_START_MAX_RETRIES', 5),
  campaignStartRetryBaseMs: nonNegativeInt('CAMPAIGN_START_RETRY_BASE_MS', 2000),
  campaignStartRetryMaxMs: nonNegativeInt('CAMPAIGN_START_RETRY_MAX_MS', 30000)
};
