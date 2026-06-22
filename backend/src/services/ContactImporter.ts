import { ContactRepository, ContactInput } from '../repositories/ContactRepository.js'
import { BRAZIL_COUNTRY_CODE, CPF_DIGIT_COUNT } from '../constants/index.js'
import { AppError } from '../errors/AppError.js'

export interface RawContactInput {
  nome?: string
  cpf?: string
  telefone?: string
  instituicao?: string
}

export interface ImportResult {
  totalReceived: number
  newContacts: number
  linked: number
}

export class ContactImporter {
  constructor(private readonly contactRepository: ContactRepository) {}

  async importForCampaign(campaignId: string, rawContacts: RawContactInput[]): Promise<ImportResult> {
    const normalizedContacts = rawContacts.map(contact => this.normalizeContact(contact))
    const validContacts = normalizedContacts.filter(contact => this.isValidContact(contact))

    if (validContacts.length === 0) {
      throw AppError.badRequest('Nenhum contato válido encontrado para importação')
    }

    const phones = validContacts.map(contact => contact.telefone)
    const existingPhoneMap = await this.contactRepository.findExistingByPhones(phones)

    const newContacts = validContacts.filter(contact => !existingPhoneMap.has(contact.telefone))
    const newPhoneMap = await this.contactRepository.insertMany(newContacts)

    const allPhoneMap = new Map([...existingPhoneMap, ...newPhoneMap])

    const uniqueContactIds = this.deduplicateContactIds(validContacts, allPhoneMap)
    await this.contactRepository.linkToCampaign(campaignId, uniqueContactIds)

    return {
      totalReceived: rawContacts.length,
      newContacts: newContacts.length,
      linked: uniqueContactIds.length,
    }
  }

  private normalizeContact(raw: RawContactInput): ContactInput {
    const cleanPhone = (raw.telefone ?? '').replace(/\D/g, '')
    const normalizedPhone = this.normalizePhone(cleanPhone)

    return {
      nome: raw.nome ?? null,
      cpf: (raw.cpf ?? '').replace(/\D/g, ''),
      telefone: normalizedPhone,
      instituicao: raw.instituicao ?? null,
    }
  }

  private normalizePhone(digits: string): string {
    const hasCountryCode = digits.length === 12 || digits.length === 13
    return hasCountryCode ? `+${digits}` : `+${BRAZIL_COUNTRY_CODE}${digits}`
  }

  private isValidContact(contact: ContactInput): boolean {
    const hasValidPhone = contact.telefone.replace(/\D/g, '').length >= 10
    const hasValidCpf = contact.cpf.length === CPF_DIGIT_COUNT
    return hasValidPhone && hasValidCpf
  }

  private deduplicateContactIds(contacts: ContactInput[], phoneMap: Map<string, string>): string[] {
    const seen = new Set<string>()
    const ids: string[] = []

    for (const contact of contacts) {
      const contactId = phoneMap.get(contact.telefone)
      if (contactId && !seen.has(contactId)) {
        seen.add(contactId)
        ids.push(contactId)
      }
    }

    return ids
  }
}