import { supabaseAdmin } from '../lib/supabase.js'
import { AppError } from '../errors/AppError.js'
import { LIMITS } from '../constants/index.js'

export interface ContactInput {
  nome: string | null
  cpf: string
  telefone: string
  instituicao: string | null
}

export class ContactRepository {
  async findExistingByPhones(phones: string[]): Promise<Map<string, string>> {
    const phoneMap = new Map<string, string>()

    const chunks = this.chunkArray(phones, LIMITS.MAX_CONTACTS_PER_IMPORT_CHUNK)

    for (const chunk of chunks) {
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .select('id, telefone')
        .in('telefone', chunk)

      if (error) {
        throw AppError.internal('Erro ao buscar contatos existentes', error)
      }

      data?.forEach((contact: { id: string; telefone: string }) => {
        phoneMap.set(contact.telefone, contact.id)
      })
    }

    return phoneMap
  }

  async insertMany(contacts: ContactInput[]): Promise<Map<string, string>> {
    const phoneMap = new Map<string, string>()
    const chunks = this.chunkArray(contacts, LIMITS.MAX_CONTACTS_PER_IMPORT_CHUNK)

    for (const chunk of chunks) {
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .insert(chunk)
        .select('id, telefone')

      if (error) {
        throw AppError.internal('Erro ao inserir contatos', error)
      }

      data?.forEach((contact: { id: string; telefone: string }) => {
        phoneMap.set(contact.telefone, contact.id)
      })
    }

    return phoneMap
  }

  async linkToCampaign(campaignId: string, contactIds: string[]): Promise<void> {
    const payload = contactIds.map(contactId => ({
      campaign_id: campaignId,
      contact_id: contactId,
      status: 'pendente',
      tentativas: 0,
    }))

    const chunks = this.chunkArray(payload, LIMITS.MAX_CONTACTS_PER_IMPORT_CHUNK)

    for (const chunk of chunks) {
      const { error } = await supabaseAdmin
        .from('campaign_contacts')
        .upsert(chunk, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true })

      if (error) {
        throw AppError.internal('Erro ao vincular contatos à campanha', error, { campaignId })
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from(
      { length: Math.ceil(array.length / size) },
      (_, index) => array.slice(index * size, (index + 1) * size)
    )
  }
}