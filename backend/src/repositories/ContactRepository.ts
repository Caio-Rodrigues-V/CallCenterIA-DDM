// backend/src/repositories/ContactRepository.ts
import { prisma } from '../lib/prisma.js'
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
      try {
        const contacts = await prisma.contact.findMany({
          where: { telefone: { in: chunk } },
          select: { id: true, telefone: true },
        })
        contacts.forEach(c => phoneMap.set(c.telefone, c.id))
      } catch (error) {
        throw AppError.internal('Erro ao buscar contatos existentes', error)
      }
    }

    return phoneMap
  }

  async insertMany(contacts: ContactInput[]): Promise<Map<string, string>> {
    const phoneMap = new Map<string, string>()
    const chunks = this.chunkArray(contacts, LIMITS.MAX_CONTACTS_PER_IMPORT_CHUNK)

    for (const chunk of chunks) {
      try {
        // skipDuplicates evita erro em corridas concorrentes — comportamento idêntico ao upsert anterior
        await prisma.contact.createMany({
          data: chunk,
          skipDuplicates: true,
        })

        // Busca os IDs dos recém-inseridos (ou já existentes com o mesmo telefone)
        const inserted = await prisma.contact.findMany({
          where: { telefone: { in: chunk.map(c => c.telefone) } },
          select: { id: true, telefone: true },
        })
        inserted.forEach(c => phoneMap.set(c.telefone, c.id))
      } catch (error) {
        throw AppError.internal('Erro ao inserir contatos', error)
      }
    }

    return phoneMap
  }

  async linkToCampaign(campaignId: string, contactIds: string[]): Promise<void> {
    const payload = contactIds.map(contactId => ({
      campaign_id: campaignId,
      contact_id: contactId,
      status: 'pendente',
      tentativas_realizadas: 0,
    }))

    const chunks = this.chunkArray(payload, LIMITS.MAX_CONTACTS_PER_IMPORT_CHUNK)

    for (const chunk of chunks) {
      try {
        await prisma.campaignContact.createMany({
          data: chunk,
          skipDuplicates: true, // unique([campaign_id, contact_id]) no schema
        })
      } catch (error) {
        throw AppError.internal('Erro ao vincular contatos à campanha', error, { campaignId })
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from(
      { length: Math.ceil(array.length / size) },
      (_, index) => array.slice(index * size, (index + 1) * size),
    )
  }
}
