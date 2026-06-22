export const ContactStatus = {
  PENDING: 'pendente',
  IN_PROGRESS: 'em_andamento',
  COMPLETED: 'concluido',
  FAILED: 'falhou',
} as const

export const CallStatus = {
  QUEUED: 'queued',
  COMPLETED: 'completed',
  VOICEMAIL: 'voicemail-reached',
} as const

export const TechnicalFailureReasons = [
  'voicemail-reached',
  'pipeline-error-openai-voice-failed',
  'assistant-not-found',
  'invalid-number',
  'no-answer',
  'busy',
] as const

export const SuccessfulEndingReasons = [
  'customer-ended-call',
  'assistant-ended-call',
] as const

export const LIMITS = {
  MAX_CALLS_PER_QUERY: 1000,
  MAX_CONTACTS_PER_IMPORT_CHUNK: 300,
  MIN_CALL_DURATION_FOR_SUCCESS_SECONDS: 15,
  VAPI_CACHE_TTL_SECONDS: 120,
} as const

export const CPF_DIGIT_COUNT = 11
export const BRAZIL_COUNTRY_CODE = '55'