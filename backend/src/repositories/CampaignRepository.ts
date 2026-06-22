import { supabaseAdmin } from '../lib/supabase.js'
import { AppError } from '../errors/AppError.js'

export interface CampaignRow {
  id: string
  nome: string
  instituicao: string
  tipo_telefonia: string
  ativa: boolean
  assistant_vapi_id: string
  linha_vapi_id: string
  max_tentativas: number
  intervalo_minutos: number
  janela_inicio: string
  janela_fim: string
  ligacoes_simultaneas: number
  ignore_horario: boolean
}

export interface CampaignContactRow {
  id: string
  contact_id: string
  tentativas_realizadas: number
  ultima_tentativa: string | null
  status: string
  contacts: {
    id: string
    nome: string
    cpf: string
    telefone: string
    instituicao: string
  }
}

export class CampaignRepository {
  async findById(campaignId: string): Promise<CampaignRow> {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (error || !data) {
      throw AppError.notFound('Campanha não encontrada', { campaignId })
    }

    return data as CampaignRow
  }

  async findAll(): Promise<CampaignRow[]> {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw AppError.internal('Erro ao buscar campanhas', error)
    }

    return (data ?? []) as CampaignRow[]
  }

  async countContactsByStatus(campaignId: string, status: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('campaign_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', status)

    if (error) {
      throw AppError.internal('Erro ao contar contatos', error, { campaignId, status })
    }

    return count ?? 0
  }

  async findEligibleContacts(campaignId: string): Promise<CampaignContactRow[]> {
    const { data, error } = await supabaseAdmin
      .from('campaign_contacts')
      .select(`
        id,
        tentativas_realizadas,
        ultima_tentativa,
        status,
        contact_id,
        contacts (
          id,
          nome,
          cpf,
          telefone,
          instituicao
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'pendente')

    if (error) {
      throw AppError.internal('Erro ao buscar contatos elegíveis', error, { campaignId })
    }

    return (data ?? []) as unknown as CampaignContactRow[]
  }

  async markContactAsInProgress(campaignContactId: string, currentAttempts: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('campaign_contacts')
      .update({
        status: 'em_andamento',
        tentativas_realizadas: currentAttempts + 1,
        ultima_tentativa: new Date().toISOString(),
      })
      .eq('id', campaignContactId)

    if (error) {
      throw AppError.internal('Erro ao atualizar status do contato', error, { campaignContactId })
    }
  }

  async updateContactStatus(campaignContactId: string, status: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('campaign_contacts')
      .update({
        status,
        ultima_tentativa: new Date().toISOString(),
      })
      .eq('id', campaignContactId)

    if (error) {
      throw AppError.internal('Erro ao atualizar status do contato', error, { campaignContactId, status })
    }
  }

  async toggleActive(campaignId: string, isActive: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({ ativa: isActive })
      .eq('id', campaignId)

    if (error) {
      throw AppError.internal('Erro ao atualizar status da campanha', error, { campaignId })
    }
  }
}