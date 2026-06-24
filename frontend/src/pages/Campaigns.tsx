// frontend/src/pages/Campaigns.tsx
import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, Input } from '../components/ui'
import { Play, Plus, Phone, Users, Clock, RefreshCw, Loader2, TrendingUp } from 'lucide-react'
import { campaignApi } from '../services/api'
import { logService } from '../services/logService'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

const defaultForm = {
  nome: '',
  instituicao: '',
  tipo_telefonia: 'vapi',
  assistant_vapi_id: '',
  linha_vapi_id: '',
  max_tentativas: '3',
  intervalo_minutos: '60',
  janela_inicio: '08:00',
  janela_fim: '18:00',
  ligacoes_simultaneas: '1',
  ignore_horario: false,
}

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [creating, setCreating] = useState(false)

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const data = await campaignApi.getAll()
      setCampaigns(data)
    } catch (error) {
      logService.error('Campaigns', 'Erro ao buscar campanhas', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCampaigns() }, [])

  const handleExecuteCampaign = async (campaign: any) => {
    if (executingId) return
    if (!confirm(`Deseja executar a campanha "${campaign.nome}" agora?`)) return
    setExecutingId(campaign.id)
    try {
      const result = await campaignApi.start(campaign.id)
      alert(`Campanha iniciada! ${result.totalEnqueued} contatos enfileirados.`)
    } catch (error: any) {
      alert(`Erro ao executar: ${error.message}`)
    } finally {
      setExecutingId(null)
    }
  }

  const handleToggle = async (campaign: any) => {
    try {
      await campaignApi.toggle(campaign.id, !campaign.ativa)
      fetchCampaigns()
    } catch {
      alert('Erro ao atualizar status.')
    }
  }

  const handleCreate = async () => {
    if (!form.nome) return alert('Nome é obrigatório.')
    if (!form.assistant_vapi_id) return alert('Assistant Vapi ID é obrigatório.')
    if (!form.linha_vapi_id) return alert('Linha Vapi ID é obrigatório.')

    setCreating(true)
    try {
      const res = await fetch(`${API}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_tentativas: Number(form.max_tentativas),
          intervalo_minutos: Number(form.intervalo_minutos),
          ligacoes_simultaneas: Number(form.ligacoes_simultaneas),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      alert('Campanha criada com sucesso!')
      setIsCreateOpen(false)
      setForm(defaultForm)
      fetchCampaigns()
    } catch (e: any) {
      alert(`Erro ao criar campanha: ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  const activeCampaignsCount = campaigns.filter(c => c.ativa).length
  const totalContacts = campaigns.reduce((acc, c) => acc + (c.totalContacts ?? 0), 0)
  const pendingContacts = campaigns.reduce((acc, c) => acc + (c.pendingContacts ?? 0), 0)
  const completedContacts = campaigns.reduce((acc, c) => acc + (c.completedContacts ?? 0), 0)
  const globalEfficiency = totalContacts > 0 ? Math.round((completedContacts / totalContacts) * 100) : 0

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Campanhas Ativas</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{activeCampaignsCount}</h3>
            </div>
            <div className="h-10 w-10 bg-orange-50 dark:bg-orange-900/20 rounded-md flex items-center justify-center text-primary">
              <Phone className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Contatos</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{totalContacts}</h3>
            </div>
            <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-md flex items-center justify-center text-slate-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pendentes</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{pendingContacts}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Eficiência Global</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{globalEfficiency}%</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center justify-center text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface dark:bg-dark-surface rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Campanhas</h2>
            <button onClick={fetchCampaigns} className="p-1.5 text-slate-400 hover:text-primary rounded-md transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Nova Campanha
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Nenhuma campanha encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Campanha</th>
                  <th className="px-5 py-3">Instituição</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Contatos</th>
                  <th className="px-5 py-3 text-center">Ativar</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                      {campaign.nome}
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {campaign.janela_inicio} - {campaign.janela_fim}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{campaign.instituicao || '-'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={campaign.ativa ? 'success' : 'neutral'}>
                        {campaign.ativa ? 'Ativa' : 'Pausada'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-600">{campaign.totalContacts ?? 0}</td>
                    <td className="px-5 py-3.5 text-center">
                      <div
                        onClick={() => handleToggle(campaign)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${campaign.ativa ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${campaign.ativa ? 'translate-x-4' : 'translate-x-1'}`} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleExecuteCampaign(campaign)}
                        disabled={executingId === campaign.id}
                        className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md text-green-600 transition-colors"
                        title="Executar agora"
                      >
                        {executingId === campaign.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Play className="w-3.5 h-3.5 fill-current" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <Modal title="Nova Campanha" isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setForm(defaultForm) }}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Nome da Campanha *" value={form.nome} onChange={f('nome')} placeholder="Ex: Cobrança Maio 2026" />
              </div>
              <Input label="Instituição" value={form.instituicao} onChange={f('instituicao')} placeholder="Ex: Faculdade XYZ" />
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Telefonia</label>
                <select className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={form.tipo_telefonia} onChange={f('tipo_telefonia')}>
                  <option value="vapi">VAPI</option>
                  <option value="sip">SIP</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Input label="Assistant Vapi ID *" value={form.assistant_vapi_id} onChange={f('assistant_vapi_id')} placeholder="Ex: d0e0eea1-2e61-4ae5-91b8-..." />
              </div>
              <div className="md:col-span-2">
                <Input label="Linha Vapi ID *" value={form.linha_vapi_id} onChange={f('linha_vapi_id')} placeholder="Ex: phone-number-id (separe por vírgula para múltiplas)" />
              </div>
              <Input label="Janela Início" type="time" value={form.janela_inicio} onChange={f('janela_inicio')} />
              <Input label="Janela Fim" type="time" value={form.janela_fim} onChange={f('janela_fim')} />
              <Input label="Máx. Tentativas" type="number" value={form.max_tentativas} onChange={f('max_tentativas')} />
              <Input label="Intervalo (min)" type="number" value={form.intervalo_minutos} onChange={f('intervalo_minutos')} />
              <Input label="Ligações Simultâneas" type="number" value={form.ligacoes_simultaneas} onChange={f('ligacoes_simultaneas')} />
              <div className="flex items-center gap-3 pt-6">
                <div
                  onClick={() => setForm(prev => ({ ...prev, ignore_horario: !prev.ignore_horario }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${form.ignore_horario ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${form.ignore_horario ? 'translate-x-4' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">Ignorar janela de horário</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); setForm(defaultForm) }}>Cancelar</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Criando...' : 'Criar Campanha'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
