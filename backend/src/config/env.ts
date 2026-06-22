import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const envSchema = z.object({
  PORT: z.string().default('4000'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  BACKEND_PUBLIC_URL: z.string().default('http://localhost:4000'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL é obrigatório'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatório'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY é obrigatório'),
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatório'),
  VAPI_API_KEY: z.string().min(1, 'VAPI_API_KEY é obrigatório'),
  N8N_WEBHOOK_URL: z.string().min(1, 'N8N_WEBHOOK_URL é obrigatório'),
  CAMPAIGN_MAX_CONCURRENCY: z.string().default('6'),
  CAMPAIGN_REQUEST_INTERVAL_MS: z.string().default('250'),
  CAMPAIGN_MAX_RETRIES: z.string().default('5'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = {
  port: Number(parsed.data.PORT),
  frontendOrigin: parsed.data.FRONTEND_ORIGIN,
  backendPublicUrl: parsed.data.BACKEND_PUBLIC_URL,
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
  redisUrl: parsed.data.REDIS_URL,
  vapiApiKey: parsed.data.VAPI_API_KEY,
  n8nWebhookUrl: parsed.data.N8N_WEBHOOK_URL,
  campaignMaxConcurrency: Number(parsed.data.CAMPAIGN_MAX_CONCURRENCY),
  campaignRequestIntervalMs: Number(parsed.data.CAMPAIGN_REQUEST_INTERVAL_MS),
  campaignMaxRetries: Number(parsed.data.CAMPAIGN_MAX_RETRIES),
} as const