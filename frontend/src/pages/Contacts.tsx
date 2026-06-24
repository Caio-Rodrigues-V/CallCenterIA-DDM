// frontend/src/pages/Contacts.tsx
import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Input, Modal } from '../components/ui'
import { Search, Upload, Plus, Trash2, RotateCw, RefreshCw, Edit, Loader2 } from 'lucide-react'
import { Contact, Campaign } from '../types'
import { campaignApi } from '../services/api'
import { logService } from '../services/logService'
import * as XLSX from 'xlsx'

const API = import.meta.env.VITE_API_BASE_URL ?? ''
const CPF_DIGIT_COUNT = 11

export const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [campaignsList, setCampaignsList] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', cpf: '', phone: '', institution: '', campaignId: '' })
  const [creating, setCreating] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importCampaignId, setImportCampaignId] = useState('')
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ pct: number; label: string } | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', cpf: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000]

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rows, campaignsData] = await Promise.all([
        fetch(`${API}/api/contacts`).then(r => r.json()),
        campaignApi.getAll(),
      ])

      const mappedContacts: Contact[] = (rows ?? []).map((row: any) => ({
        id: row.id,
        contactId: row.contact_id,
        name: row.contact?.nome ?? 'Sem Nome',
        cpf: row.contact?.cpf ?? '',
        institution: row.contact?.instituicao ?? '',
        campaignId: row.campaign?.id,
        campaignName: row.campaign?.nome ?? 'Campanha Removida',
        status: row.status,
        attempts: row.tentativas_realizadas,
        lastAttempt: row.ultima_tentativa
          ? new Date(row.ultima_tentativa).toLocaleString('pt-BR')
          : undefined,
        phone: row.contact?.telefone ?? '',
      }))

      setContacts(mappedContacts)
      setCampaignsList(campaignsData)
    } catch (error: any) {
      logService.error('Contacts', 'Erro ao carregar dados', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const isValidCpf = (cpf: string) => cpf.replace(/\D/g, '').length === CPF_DIGIT_COUNT

  const handleResetContact = async (id: string) => {
    if (!confirm('Resetar tentativas deste contato?')) return
    try {
      await fetch(`${API}/api/contacts/${id}/reset`, { method: 'PATCH' })
      setContacts(prev => prev.map(c => c.id === id ? { ...c, attempts: 0, status: 'pendente' } : c))
    } catch {
      alert('Erro ao resetar contato.')
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Remover este contato da campanha?')) return
    try {
      await fetch(`${API}/api/contacts/${id}`, { method: 'DELETE' })
      setContacts(prev => prev.filter(c => c.id !== id))
    } catch {
      alert('Erro ao excluir contato.')
    }
  }

  const handleCreateSubmit = async () => {
    if (!createForm.campaignId) return alert('Selecione uma campanha.')
    if (!createForm.name || !createForm.phone) return alert('Nome e Telefone são obrigatórios.')
    if (!isValidCpf(createForm.cpf)) return alert('CPF inválido. Deve conter 11 dígitos.')

    setCreating(true)
    try {
      const res = await fetch(`${API}/api/contacts/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: createForm.campaignId,
          contacts: [{ nome: createForm.name, cpf: createForm.cpf, telefone: createForm.phone, instituicao: createForm.institution }],
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      alert('Contato criado com sucesso!')
      setIsCreateOpen(false)
      setCreateForm({ name: '', cpf: '', phone: '', institution: '', campaignId: '' })
      fetchData()
    } catch (e: any) {
      alert(`Erro ao criar contato: ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setEditForm({ name: contact.name, phone: contact.phone, cpf: contact.cpf ?? '' })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingContact) return
    if (!isValidCpf(editForm.cpf)) return alert('CPF inválido. Deve conter 11 dígitos.')

    const normalizedCpf = editForm.cpf.replace(/\D/g, '')
    const cleanPhone = editForm.phone.replace(/\D/g, '')
    const normalizedPhone = cleanPhone.length === 12 || cleanPhone.length === 13 ? `+${cleanPhone}` : `+55${cleanPhone}`

    try {
      const res = await fetch(`${API}/api/contacts/${editingContact.contactId}/contact`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editForm.name, telefone: normalizedPhone, cpf: normalizedCpf }),
      })
      if (!res.ok) throw new Error(await res.text())
      setContacts(prev => prev.map(c =>
        c.id === editingContact.id ? { ...c, name: editForm.name, phone: normalizedPhone, cpf: normalizedCpf } : c
      ))
      setIsEditOpen(false)
      alert('Contato atualizado com sucesso!')
    } catch (e: any) {
      alert(`Erro ao atualizar contato: ${e.message}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (evt: any) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        setImportPreview(XLSX.utils.sheet_to_json(ws))
      } catch {
        alert('Erro ao ler arquivo Excel/CSV.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImportSubmit = async () => {
    if (!importCampaignId) return alert('Selecione uma campanha de destino.')
    if (!importPreview.length) return alert('Arquivo vazio ou inválido.')

    const formattedData = importPreview
      .map((row: any) => {
        const n: any = {}
        Object.keys(row).forEach(k => { n[k.toLowerCase().trim()] = row[k] })
        return {
          nome: n['nome'] ?? n['name'] ?? n['cliente'] ?? 'Sem Nome',
          cpf: String(n['cpf'] ?? n['documento'] ?? ''),
          telefone: String(n['telefone'] ?? n['celular'] ?? n['phone'] ?? ''),
          instituicao: n['instituicao'] ?? n['empresa'] ?? '',
        }
      })
      .filter(r => r.telefone.replace(/\D/g, '').length > 5 && r.cpf.replace(/\D/g, '').length === CPF_DIGIT_COUNT)

    if (!formattedData.length) return alert("Nenhum contato válido. Verifique as colunas 'nome', 'telefone' e 'cpf'.")

    setImporting(true)
    setImportProgress({ pct: 0, label: 'Iniciando...' })

    try {
      const BATCH_SIZE = 2000
      const totalBatches = Math.ceil(formattedData.length / BATCH_SIZE)
      for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        setImportProgress({ pct: Math.round((batchNumber - 1) / totalBatches * 100), label: `Processando lote ${batchNumber} de ${totalBatches}...` })
        const res = await fetch(`${API}/api/contacts/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: importCampaignId, contacts: formattedData.slice(i, i + BATCH_SIZE) }),
        })
        if (!res.ok) throw new Error(await res.text())
      }
      setImportProgress({ pct: 100, label: 'Importação concluída.' })
      alert(`Sucesso! ${formattedData.length} contatos importados.`)
      setIsImportOpen(false)
      setImportFile(null)
      setImportPreview([])
      setImportProgress(null)
      fetchData()
    } catch (e: any) {
      setImportProgress(null)
      alert(`Erro na importação: ${e.message}`)
    } finally {
      setImporting(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.cpf.includes(searchTerm)
    const matchesCampaign = selectedCampaignFilter === 'all' || contact.campaignId === selectedCampaignFilter
    return matchesSearch && matchesCampaign
  })

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedContacts = filteredContacts.slice((safePage - 1) * pageSize, safePage * pageSize)
  const rangeStart = filteredContacts.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filteredContacts.length)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gerenciamento de Contatos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Visualize e gerencie leads de todas as campanhas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={RefreshCw} onClick={fetchData} title="Atualizar" />
            <Button variant="danger" icon={Plus} onClick={() => setIsCreateOpen(true)}>Novo Contato</Button>
            <Button variant="outline" icon={Upload} onClick={() => setIsImportOpen(true)}>Importar</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input icon={Search} placeholder="Buscar por nome, telefone ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            value={selectedCampaignFilter}
            onChange={e => { setSelectedCampaignFilter(e.target.value); setCurrentPage(1) }}
          >
            <option value="all">Todas as Campanhas</option>
            {campaignsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Lista de Contatos</h3>
          <span className="text-sm text-slate-500">{filteredContacts.length} registros</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            Carregando contatos...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
            Nenhum contato encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome / CPF</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tentativas</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{contact.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{contact.cpf || '-'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{contact.phone}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]">{contact.campaignName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={contact.status === 'concluido' ? 'success' : contact.status === 'falhou' ? 'danger' : contact.status === 'em_andamento' ? 'primary' : 'neutral'}>
                        {contact.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">{contact.attempts}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleResetContact(contact.id)} className="p-1.5 hover:bg-blue-100 rounded text-blue-500 transition-colors" title="Resetar Tentativas">
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(contact)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition-colors" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteContact(contact.id)} className="p-1.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors" title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredContacts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">{rangeStart}–{rangeEnd} de {filteredContacts.length}</p>
            <div className="flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map(size => (
                <button key={size} onClick={() => { setPageSize(size); setCurrentPage(1) }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${pageSize === size ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                  {size}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-3 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 disabled:opacity-40">←</button>
              <span className="text-xs text-slate-500">{safePage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-3 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </Card>

      {isCreateOpen && (
        <Modal title="Novo Contato" onClose={() => setIsCreateOpen(false)}>
          <div className="space-y-4">
            <Input label="Nome" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="CPF (só números)" value={createForm.cpf} onChange={e => setCreateForm(f => ({ ...f, cpf: e.target.value }))} />
            <Input label="Telefone" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Instituição" value={createForm.institution} onChange={e => setCreateForm(f => ({ ...f, institution: e.target.value }))} />
            <select className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={createForm.campaignId} onChange={e => setCreateForm(f => ({ ...f, campaignId: e.target.value }))}>
              <option value="">Selecione uma campanha</option>
              {campaignsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleCreateSubmit} disabled={creating}>
                {creating ? 'Criando...' : 'Criar Contato'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {isEditOpen && editingContact && (
        <Modal title="Editar Contato" onClose={() => setIsEditOpen(false)}>
          <div className="space-y-4">
            <Input label="Nome" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="CPF (só números)" value={editForm.cpf} onChange={e => setEditForm(f => ({ ...f, cpf: e.target.value }))} />
            <Input label="Telefone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveEdit}>Salvar</Button>
            </div>
          </div>
        </Modal>
      )}

      {isImportOpen && (
        <Modal title="Importar Contatos" onClose={() => setIsImportOpen(false)}>
          <div className="space-y-4">
            <select className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={importCampaignId} onChange={e => setImportCampaignId(e.target.value)}>
              <option value="">Selecione a campanha de destino</option>
              {campaignsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="block w-full text-sm text-slate-500" />
            {importPreview.length > 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-400">{importPreview.length} registros detectados no arquivo.</p>
            )}
            {importProgress && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${importProgress.pct}%` }} />
                </div>
                <p className="text-xs text-slate-500">{importProgress.label}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleImportSubmit} disabled={importing}>
                {importing ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
