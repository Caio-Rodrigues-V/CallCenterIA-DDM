import React, { useState, useEffect, useMemo } from 'react'
import { BarChart3, Calendar, Handshake, Loader2, RefreshCw, Search, X } from 'lucide-react'
import { Card, Input, Button } from '../components/ui'
import { supabase } from '../lib/supabaseClient'
import { AcordoKpi } from '../types'

const formatDate = (value?: string) => {
  if (!value) return '-'
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0)

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export const KpiAcordos: React.FC = () => {
  const [rows, setRows] = useState<AcordoKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('Todas as Campanhas')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: kpis, error: kpisError } = await supabase
        .from('vw_acordos_kpis')
        .select('*')
        .order('referencia_data', { ascending: false })
        .limit(2000)

      if (kpisError) throw kpisError

      const { data: formalizados, error: formalizadosError } = await supabase
        .from('acordos_formalizados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000)

      if (formalizadosError) throw formalizadosError

      const formalizadosMap = new Map<string, { count: number; value: number }>()

      ;(formalizados ?? []).forEach((row: any) => {
        const key = `${row.campaign_id}|${String(row.created_at ?? '').slice(0, 10)}`
        const current = formalizadosMap.get(key) ?? { count: 0, value: 0 }
        formalizadosMap.set(key, {
          count: current.count + 1,
          value: current.value + Number(row.valor_recuperado || 0),
        })
      })

      const mapped: AcordoKpi[] = (kpis ?? []).map((row: any) => {
        const key = `${row.campaign_id}|${row.referencia_data}`
        const formalizado = formalizadosMap.get(key) ?? { count: 0, value: 0 }
        return {
          ...row,
          chamadas_discadas: Number(row.chamadas_discadas || 0),
          chamadas_atendidas: Number(row.chamadas_atendidas || 0),
          contatos_efetivos: Number(row.contatos_efetivos || 0),
          acordos_fechados: Number(row.acordos_fechados || 0),
          chamadas_totais: Number(row.chamadas_totais || 0),
          custo_operacional: Number(row.custo_operacional || 0),
          valor_recuperado: Number(row.valor_recuperado || 0),
          taxa_conversao: Number(row.taxa_conversao || 0),
          taxa_atendimento: Number(row.taxa_atendimento || 0),
          tma_segundos: Number(row.tma_segundos || 0),
          cpr: Number(row.cpr || 0),
          call_failure_rate: Number(row.call_failure_rate || 0),
          taxa_engajamento: Number(row.taxa_engajamento || 0),
          acordos_formalizados_count: formalizado.count,
          valor_formalizado: formalizado.value,
        }
      })

      setRows(mapped)
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar KPIs de acordos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const campaignOptions = useMemo(() => {
    const names = rows.map(r => r.campanha_nome).filter(Boolean).sort((a, b) => a.localeCompare(b))
    return ['Todas as Campanhas', ...Array.from(new Set(names))]
  }, [rows])

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return rows.filter(row => {
      const campaignMatch = selectedCampaign === 'Todas as Campanhas' || row.campanha_nome === selectedCampaign
      const dateMatch = (!startDate || row.referencia_data >= startDate) && (!endDate || row.referencia_data <= endDate)
      const text = [row.campanha_nome, row.campanha_instituicao, row.campaign_id, row.referencia_data].filter(Boolean).join(' ').toLowerCase()
      return campaignMatch && dateMatch && (!term || text.includes(term))
    })
  }, [rows, searchTerm, selectedCampaign, startDate, endDate])

  const totals = useMemo(() =>
    filteredRows.reduce(
      (acc, row) => ({
        acordos: acc.acordos + row.acordos_fechados,
        formalizados: acc.formalizados + (row.acordos_formalizados_count ?? 0),
        valorRecuperado: acc.valorRecuperado + row.valor_recuperado,
        custoOperacional: acc.custoOperacional + row.custo_operacional,
        chamadas: acc.chamadas + row.chamadas_totais,
      }),
      { acordos: 0, formalizados: 0, valorRecuperado: 0, custoOperacional: 0, chamadas: 0 }
    ), [filteredRows])

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCampaign('Todas as Campanhas')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acordos</p>
              <p className="mt-1 text-2xl font-mono font-bold text-slate-900 dark:text-white">{formatNumber(totals.acordos)}</p>
            </div>
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/10 rounded-lg text-primary">
              <Handshake className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Formalizados</p>
              <p className="mt-1 text-2xl font-mono font-bold text-slate-900 dark:text-white">{formatNumber(totals.formalizados)}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg text-emerald-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valor Recuperado</p>
          <p className="mt-1 text-2xl font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totals.valorRecuperado)}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-slate-400">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custo Operacional</p>
          <p className="mt-1 text-2xl font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totals.custoOperacional)}</p>
        </Card>
      </div>

      <Card className="p-5 animate-slide-up">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4" /> Filtros
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Limpar</Button>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchData} disabled={loading}>Atualizar</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input icon={Search} placeholder="Buscar campanha ou instituição" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <select
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            {campaignOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input icon={Calendar} label="Início" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input icon={Calendar} label="Fim" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-hidden animate-slide-up">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">KPIs de Acordos</h2>
          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
            {filteredRows.length} RECS
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum resultado encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Campanha</th>
                  <th className="px-5 py-3">Instituição</th>
                  <th className="px-5 py-3 text-right">Discadas</th>
                  <th className="px-5 py-3 text-right">Atendidas</th>
                  <th className="px-5 py-3 text-right">Contatos</th>
                  <th className="px-5 py-3 text-right">Acordos</th>
                  <th className="px-5 py-3 text-right">Formalizados</th>
                  <th className="px-5 py-3 text-right">Valor Rec.</th>
                  <th className="px-5 py-3 text-right">Conv.</th>
                  <th className="px-5 py-3 text-right">Atend.</th>
                  <th className="px-5 py-3 text-right">TMA</th>
                  <th className="px-5 py-3 text-right">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">{formatDate(row.referencia_data)}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white min-w-[180px]">{row.campanha_nome || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{row.campanha_instituicao || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(row.chamadas_discadas)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(row.chamadas_atendidas)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(row.contatos_efetivos)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold">{formatNumber(row.acordos_fechados)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(row.acordos_formalizados_count ?? 0)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400">{formatCurrency(row.valor_recuperado)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(row.taxa_conversao, 2)}%</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatNumber(row.taxa_atendimento, 2)}%</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatDuration(row.tma_segundos)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">{formatCurrency(row.custo_operacional)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}