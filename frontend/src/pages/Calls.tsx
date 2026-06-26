import React, { useState, useEffect } from 'react'
import { Card, Badge, Button } from '../components/ui'
import { Play, ExternalLink, RefreshCw, Loader2, Phone, Activity, UserCheck, Voicemail, Download, FileText } from 'lucide-react'
import { Call } from '../types'
import { callApi } from '../services/api'
import { CallDetailsModal } from '../components/CallDetailsModal'
import { useRealtimeRefresh } from '../services/realtime'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

export const Calls: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState('Todas as Campanhas')
  const [selectedClient, setSelectedClient] = useState('Todos os Clientes')
  const [selectedStatus, setSelectedStatus] = useState('Todos os Status')
  const [selectedDate, setSelectedDate] = useState('Todas as Datas')
  const [selectedSuccess, setSelectedSuccess] = useState('Todos')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000]

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const data = await callApi.getAll()
      setCalls(data)
    } catch (error) {
      console.error('[Calls] erro ao buscar ligações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalls()
  }, [])
  useRealtimeRefresh(['calls:changed'], () => fetchCalls())

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (value: string) => {
      setter(value)
      setCurrentPage(1)
    }

  const uniqueCampaigns = ['Todas as Campanhas', ...Array.from(new Set(calls.map(c => c.campaignName))).filter(Boolean).sort()]
  const uniqueClients = ['Todos os Clientes', ...Array.from(new Set(calls.map(c => c.clientName))).filter(Boolean).sort()]
  const uniqueStatus = ['Todos os Status', ...Array.from(new Set(calls.map(c => c.status))).filter(Boolean).sort()]
  const uniqueDates = ['Todas as Datas', ...Array.from(new Set(calls.map(c => c.date.split(',')[0].trim()))).filter(Boolean)]

  const filteredCalls = calls.filter(call => {
    const matchCampaign = selectedCampaign === 'Todas as Campanhas' || call.campaignName === selectedCampaign
    const matchClient = selectedClient === 'Todos os Clientes' || call.clientName === selectedClient
    const matchStatus = selectedStatus === 'Todos os Status' || call.status === selectedStatus
    const matchDate = selectedDate === 'Todas as Datas' || call.date.split(',')[0].trim() === selectedDate
    const matchSuccess =
      selectedSuccess === 'Todos' ||
      (selectedSuccess === 'Sucesso' && call.success === true) ||
      (selectedSuccess === 'Sem Sucesso' && call.success === false)
    return matchCampaign && matchClient && matchStatus && matchDate && matchSuccess
  })

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCalls = filteredCalls.slice((safePage - 1) * pageSize, safePage * pageSize)
  const rangeStart = filteredCalls.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filteredCalls.length)

  const kpiTotalToday = calls.filter(c => c.date.startsWith(new Date().toLocaleDateString('pt-BR'))).length
  const kpiActive = calls.filter(c => c.status === 'Em andamento').length
  const completedCalls = calls.filter(c => c.status === 'Concluída')
  const kpiAnsweredRate = calls.length > 0 ? Math.round((completedCalls.length / calls.length) * 100) : 0

  const handleOpenDetails = async (call: Call) => {
    setSelectedCall(call)
    setIsModalOpen(true)
    try {
      const fresh = await callApi.getById(call.id)
      setSelectedCall(prev => prev ? { ...prev, ...fresh } : fresh)
    } catch (error) {
      console.error('[Calls] erro ao buscar detalhes:', error)
    }
  }

  const downloadCsv = (path: string) => {
    window.open(`${API}${path}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-primary">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chamadas Hoje</p>
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{kpiTotalToday}</span>
          </div>
          <Phone className="w-5 h-5 text-primary" />
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Em Curso</p>
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{kpiActive}</span>
          </div>
          <Activity className="w-5 h-5 text-blue-500" />
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taxa de Alô</p>
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{kpiAnsweredRate}%</span>
          </div>
          <UserCheck className="w-5 h-5 text-emerald-500" />
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</p>
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{calls.length}</span>
          </div>
          <Voicemail className="w-5 h-5 text-purple-500" />
        </Card>
      </div>

      <div className="bg-surface dark:bg-dark-surface p-5 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { value: selectedCampaign, setter: setSelectedCampaign, options: uniqueCampaigns },
            { value: selectedClient, setter: setSelectedClient, options: uniqueClients },
            { value: selectedStatus, setter: setSelectedStatus, options: uniqueStatus },
            { value: selectedDate, setter: setSelectedDate, options: uniqueDates },
          ].map(({ value, setter, options }, i) => (
            <select
              key={i}
              value={value}
              onChange={e => handleFilterChange(setter)(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            >
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <select
            value={selectedSuccess}
            onChange={e => handleFilterChange(setSelectedSuccess)(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="Todos">Todos os Resultados</option>
            <option value="Sucesso">✓ Sucesso</option>
            <option value="Sem Sucesso">✕ Sem Sucesso</option>
          </select>
        </div>
      </div>

      <div className="bg-surface dark:bg-dark-surface rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Histórico</h2>
            <button onClick={fetchCalls} className="p-1.5 text-slate-400 hover:text-primary rounded-md">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={FileText} onClick={() => downloadCsv('/api/calls/export/transcripts')}>
              Transcrições
            </Button>
            <Button variant="outline" size="sm" icon={Download} onClick={() => downloadCsv('/api/calls/export/csv')}>
              Ligações
            </Button>
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
              {filteredCalls.length} RECS
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhuma ligação encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Data/Hora</th>
                  <th className="px-5 py-3">Campanha</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Telefone</th>
                  <th className="px-5 py-3 text-center">Duração</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Sucesso</th>
                  <th className="px-5 py-3 text-right">Custo</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedCalls.map(call => (
                  <tr key={call.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">{call.date}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{call.campaignName}</td>
                    <td className="px-5 py-3.5">{call.clientName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">{call.phone}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs">{call.duration}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={call.status === 'Concluída' ? 'success' : 'danger'}>{call.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {call.success
                        ? <span className="text-green-600 font-bold">✓</span>
                        : <span className="text-slate-400 font-bold">✕</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-right">R$ {call.cost.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {call.recordingUrl && (
                          <button
                            onClick={() => window.open(call.recordingUrl, '_blank')}
                            className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md text-orange-600"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDetails(call)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-500"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredCalls.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">
              {rangeStart}–{rangeEnd} de {filteredCalls.length}
            </p>
            <div className="flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1) }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${pageSize === size ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-3 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 disabled:opacity-40">← Anterior</button>
              <span className="text-xs font-mono">{safePage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-3 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 disabled:opacity-40">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      <CallDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} call={selectedCall} />
    </div>
  )
}
