import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, Input } from '../components/ui'
import { Play, Edit, Plus, Phone, Users, Clock, RefreshCw, Loader2, TrendingUp } from 'lucide-react'
import { campaignApi } from '../services/api'
import { logService } from '../services/logService'

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [executingId, setExecutingId] = useState<string | null>(null)

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

  useEffect(() => {
    fetchCampaigns()
  }, [])

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
    } catch (error) {
      alert('Erro ao atualizar status.')
    }
  }

  const activeCampaignsCount = campaigns.filter(c => c.ativa).length
  const totalContacts = campaigns.reduce((acc, c) => acc + (c.totalContacts ?? 0), 0)
  const pendingContacts = campaigns.reduce((acc, c) => acc + (c.pendingContacts ?? 0), 0)
  const completedContacts = campaigns.reduce((acc, c) => acc + (c.completedContacts ?? 0), 0)
  const globalEfficiency = totalContacts > 0 ? Math.round((completedContacts / totalContacts) * 100) : 0

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
    </div>
  )
}