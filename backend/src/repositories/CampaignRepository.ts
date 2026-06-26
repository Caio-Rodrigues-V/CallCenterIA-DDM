// backend/src/repositories/CampaignRepository.ts
import { prisma } from '../lib/prisma.js'
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
  ultima_tentativa: Date | null
  status: string
  contact: {
    id: string
    nome: string | null
    cpf: string
    telefone: string
    instituicao: string | null
  }
}

export class CampaignRepository {
  async findById(campaignId: string): Promise<CampaignRow> {
    try {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
      if (!campaign) throw AppError.notFound('Campanha não encontrada', { campaignId })
      return campaign as unknown as CampaignRow
    } catch (error) {
      if (error instanceof AppError) throw error
      throw AppError.internal('Erro ao buscar campanha', error, { campaignId })
    }
  }

  async findAll(): Promise<CampaignRow[]> {
    try {
      const campaigns = await prisma.campaign.findMany({ orderBy: { created_at: 'desc' } })
      const campaignsWithCounts = await Promise.all(
        campaigns.map(async (campaign: any) => {
          const [totalContacts, pendingContacts, completedContacts, failedContacts, inProgressContacts] =
            await Promise.all([
              prisma.campaignContact.count({ where: { campaign_id: campaign.id } }),
              prisma.campaignContact.count({ where: { campaign_id: campaign.id, status: 'pendente' } }),
              prisma.campaignContact.count({ where: { campaign_id: campaign.id, status: 'concluido' } }),
              prisma.campaignContact.count({ where: { campaign_id: campaign.id, status: 'falhou' } }),
              prisma.campaignContact.count({ where: { campaign_id: campaign.id, status: 'em_andamento' } }),
            ])

          const successRate =
            totalContacts > 0 ? Math.round((completedContacts / totalContacts) * 100) : 0

          return {
            ...campaign,
            totalContacts,
            pendingContacts,
            completedContacts,
            failedContacts,
            inProgressContacts,
            successRate,
          }
        }),
      )

      return campaignsWithCounts as unknown as CampaignRow[]
    } catch (error) {
      throw AppError.internal('Erro ao buscar campanhas', error)
    }
  }

  async countContactsByStatus(campaignId: string, status: string): Promise<number> {
    try {
      return await prisma.campaignContact.count({ where: { campaign_id: campaignId, status } })
    } catch (error) {
      throw AppError.internal('Erro ao contar contatos', error, { campaignId, status })
    }
  }

  async findEligibleContacts(campaignId: string): Promise<CampaignContactRow[]> {
    try {
      const rows = await prisma.campaignContact.findMany({
        where: { campaign_id: campaignId, status: 'pendente' },
        select: {
          id: true,
          contact_id: true,
          tentativas_realizadas: true,
          ultima_tentativa: true,
          status: true,
          contact: {
            select: { id: true, nome: true, cpf: true, telefone: true, instituicao: true },
          },
        },
      })
      return rows as unknown as CampaignContactRow[]
    } catch (error) {
      throw AppError.internal('Erro ao buscar contatos elegíveis', error, { campaignId })
    }
  }

  async markContactAsInProgress(campaignContactId: string, currentAttempts: number): Promise<void> {
    try {
      await prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: {
          status: 'em_andamento',
          tentativas_realizadas: currentAttempts + 1,
          ultima_tentativa: new Date(),
        },
      })
    } catch (error) {
      throw AppError.internal('Erro ao atualizar status do contato', error, { campaignContactId })
    }
  }

  async updateContactStatus(campaignContactId: string, status: string): Promise<void> {
    try {
      await prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: { status, ultima_tentativa: new Date() },
      })
    } catch (error) {
      throw AppError.internal('Erro ao atualizar status do contato', error, { campaignContactId, status })
    }
  }

  async toggleActive(campaignId: string, isActive: boolean): Promise<void> {
    try {
      await prisma.campaign.update({ where: { id: campaignId }, data: { ativa: isActive } })
    } catch (error) {
      throw AppError.internal('Erro ao atualizar status da campanha', error, { campaignId })
    }
  }

  async findByCampaignContactId(
    campaignContactId: string,
  ): Promise<{ tentativas_realizadas: number; max_tentativas: number } | null> {
    try {
      const cc = await prisma.campaignContact.findUnique({
        where: { id: campaignContactId },
        select: {
          tentativas_realizadas: true,
          campaign: { select: { max_tentativas: true } },
        },
      })
      if (!cc) return null
      return {
        tentativas_realizadas: cc.tentativas_realizadas,
        max_tentativas: cc.campaign.max_tentativas,
      }
    } catch (error) {
      throw AppError.internal('Erro ao buscar campaign contact', error, { campaignContactId })
    }
  }
}
