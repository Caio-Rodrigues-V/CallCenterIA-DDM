import React, { useEffect, useState } from 'react'
import { Badge, Button, Card } from '../components/ui'
import { Download, Handshake, PhoneCall, RefreshCw, TrendingUp, UserRound } from 'lucide-react'
import { useRealtimeRefresh } from '../services/realtime'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

interface AgreementRow {
  id: string
  campanha_nome: string
  agente_id: string
  cliente: string
  telefone: string
  chamadas_atendidas: number
  acordos_fechados: number
  agendamentos: number
  status: string
  motivo: string
}

interface AgreementsResponse {
  chamadas_discadas: number
  chamadas_atendidas: number
  acordos_fechados: number
  agendamentos: number
  taxa_atendimento: number
  taxa_conversao: number
  agents: string[]
  rows: AgreementRow[]
}

const emptyData: AgreementsResponse = {
  chamadas_discadas: 0,
  chamadas_atendidas: 0,
  acordos_fechados: 0,
  agendamentos: 0,
  taxa_atendimento: 0,
  taxa_conversao: 0,
  agents: [],
  rows: [],
}

export const KpiAcordos: React.FC = () => {
  const [data, setData] = useState<AgreementsResponse>(emptyData)
  const [agent, setAgent] = useState('all')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (agent !== 'all') params.set('agent', agent)
      const response = await fetch(`${API}/api/reports/agreements?${params.toString()}`)
      setData(await response.json())
    } catch (error) {
      console.error('[KpiAcordos] erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [agent])
  useRealtimeRefresh(['reports:changed', 'calls:changed'], () => loadData())

  const exportCsv = () => {
    const params = new URLSearchParams()
    if (agent !== 'all') params.set('agent', agent)
    window.open(`${API}/api/reports/agreements/export?${params.toString()}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">KPIs de Acordos</h2>
          <p className="text-sm text-slate-500">Conversão calculada sobre chamadas atendidas; atendimento calculado sobre tentativas discadas.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={agent}
            onChange={e => setAgent(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm"
          >
            <option value="all">Todos os agentes</option>
            {data.agents.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button variant="outline" icon={RefreshCw} onClick={loadData} disabled={loading} />
          <Button variant="primary" icon={Download} onClick={exportCsv}>Exportar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Acordos</p>
              <p className="text-3xl font-mono font-bold">{data.acordos_fechados}</p>
            </div>
            <Handshake className="w-6 h-6 text-orange-500" />
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Conversão</p>
              <p className="text-3xl font-mono font-bold">{data.taxa_conversao}%</p>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Atendimento</p>
              <p className="text-3xl font-mono font-bold">{data.taxa_atendimento}%</p>
            </div>
            <PhoneCall className="w-6 h-6 text-blue-500" />
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Agendamentos</p>
              <p className="text-3xl font-mono font-bold">{data.agendamentos}</p>
            </div>
            <UserRound className="w-6 h-6 text-slate-500" />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Base de Acordos e Agendamentos</h3>
          <span className="text-xs font-mono text-slate-500">{data.rows.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Campanha</th>
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : data.rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">{row.campanha_nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.agente_id}</td>
                  <td className="px-4 py-3">{row.cliente}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.telefone}</td>
                  <td className="px-4 py-3">
                    {row.acordos_fechados ? <Badge variant="success">Acordo</Badge> : row.agendamentos ? <Badge variant="primary">Agendamento</Badge> : <Badge>Sem acordo</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs">{row.motivo || row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
