interface ClassificationInput {
  endedReason?: string | null
  durationSeconds?: number | null
  transcript?: string | null
  summary?: string | null
  successEvaluation?: string | null
  structuredRatingLabel?: string | null
  structuredPurpose?: string | null
  structuredMainPoints?: string | null
}

const normalize = (value?: string | null): string => (value ?? '').toLowerCase()

export function hasAgreementSignal(input: ClassificationInput): boolean {
  const text = [
    input.transcript,
    input.summary,
    input.structuredPurpose,
    input.structuredMainPoints,
    input.structuredRatingLabel,
  ].map(normalize).join(' ')

  return input.successEvaluation === 'true' ||
    /\b(acordo|promessa|combinado|fechou|aceitou|boleto|pix|cart[aã]o|parcel|pagamento confirmado)\b/i.test(text)
}

export function hasScheduleSignal(input: ClassificationInput): boolean {
  const text = [
    input.transcript,
    input.summary,
    input.structuredPurpose,
    input.structuredMainPoints,
  ].map(normalize).join(' ')

  return /\b(retornar|retorno|ligar depois|mais tarde|amanh[aã]|semana que vem|agend|whatsapp|zap|21 ?3030 ?91(?:50|91))\b/i.test(text)
}

export function classifyCallOutcome(input: ClassificationInput): {
  status: string
  label: string
  contactStatus: 'pendente' | 'em_andamento' | 'concluido' | 'falhou'
} {
  const endedReason = normalize(input.endedReason)
  const duration = input.durationSeconds ?? 0
  const transcript = normalize(input.transcript)

  if (endedReason.includes('voicemail')) {
    return { status: 'voicemail', label: 'Caixa postal', contactStatus: 'pendente' }
  }

  if (endedReason.includes('no-answer') || endedReason.includes('busy') || endedReason.includes('invalid-number')) {
    return { status: endedReason || 'failed', label: 'Não atendida', contactStatus: 'pendente' }
  }

  if (duration >= 20 && transcript.length < 20) {
    return { status: 'silence', label: 'Silêncio', contactStatus: 'pendente' }
  }

  if (hasAgreementSignal(input)) {
    return { status: 'completed', label: 'Acordo/êxito', contactStatus: 'concluido' }
  }

  if (hasScheduleSignal(input)) {
    return { status: 'scheduled', label: 'Agendamento/retorno', contactStatus: 'concluido' }
  }

  if (endedReason.includes('assistant') || endedReason.includes('customer')) {
    return duration >= 15
      ? { status: 'completed', label: 'Atendida', contactStatus: 'concluido' }
      : { status: 'short-call', label: 'Chamada curta', contactStatus: 'pendente' }
  }

  return { status: input.endedReason ?? 'failed', label: input.endedReason ?? 'Falha', contactStatus: 'pendente' }
}

export function mapDashboardStatus(status: string): 'Concluída' | 'Falhou' | 'Em andamento' {
  if (['completed', 'scheduled'].includes(status)) return 'Concluída'
  if (['queued', 'in-progress', 'em_andamento', 'callback-received', 'status-update'].includes(status)) return 'Em andamento'
  return 'Falhou'
}
