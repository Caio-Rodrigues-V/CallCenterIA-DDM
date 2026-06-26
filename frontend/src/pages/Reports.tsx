// frontend/src/pages/Reports.tsx
import React, { useEffect, useState } from 'react'
import { Phone, Target, Clock, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { useRealtimeRefresh } from '../services/realtime'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

const chartTooltipStyle = { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC', borderRadius: '4px', fontSize: '12px' }
const chartTooltipTextStyle = { color: '#F8FAFC' }

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const Reports: React.FC = () => {
  const [kpis, setKpis] = useState<any>({ total_calls: 0, contacted_calls: 0, contact_rate_percent: 0, successful_calls: 0, success_rate_percent: 0, avg_duration_seconds: 0, total_cost: 0 })
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [terminationData, setTerminationData] = useState<any[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [costData, setCostData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [k, f, t, a, c] = await Promise.all([
        fetch(`${API}/api/reports/kpis`).then(r => r.json()),
        fetch(`${API}/api/reports/funnel`).then(r => r.json()),
        fetch(`${API}/api/reports/termination-reasons`).then(r => r.json()),
        fetch(`${API}/api/reports/daily-activity`).then(r => r.json()),
        fetch(`${API}/api/reports/daily-costs`).then(r => r.json()),
      ])
      if (k) setKpis(k)
      if (f) setFunnelData(f)
      if (t) setTerminationData(t)
      if (a) setActivityData(a)
      if (c) setCostData(c)
    } catch (error) {
      console.error('[Reports] erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])
  useRealtimeRefresh(['reports:changed', 'calls:changed'], () => fetchAll())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 dark:text-slate-400">Carregando relatórios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taxa de Contato</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{kpis.contact_rate_percent}%</h3>
            <p className="text-xs text-slate-500 mt-1">{kpis.contacted_calls} de {kpis.total_calls} chamadas</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-orange-500" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-md flex items-center justify-center text-primary">
            <Phone className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taxa de Sucesso</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{kpis.success_rate_percent}%</h3>
            <p className="text-xs text-slate-500 mt-1">{kpis.successful_calls} bem-sucedidas</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-green-500" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center justify-center text-green-600">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duração Média</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{formatDuration(kpis.avg_duration_seconds)}</h3>
            <p className="text-xs text-slate-500 mt-1">por chamada</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-slate-400" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-md flex items-center justify-center text-slate-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custo Total</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{formatCurrency(kpis.total_cost)}</h3>
            <p className="text-xs text-slate-500 mt-1">{kpis.total_calls} chamadas</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-orange-300" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-50 dark:bg-orange-900/10 rounded-md flex items-center justify-center text-orange-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-96">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Funil de Conversão</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
              <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#94A3B8' }} stroke="none" />
              <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipTextStyle} labelStyle={chartTooltipTextStyle} cursor={{ fill: '#334155', opacity: 0.2 }} />
              <Bar dataKey="value" fill="#F97316" radius={[0, 4, 4, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-96">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Motivos de Término</h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={terminationData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                {terminationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipTextStyle} labelStyle={chartTooltipTextStyle} />
              <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" formatter={value => <span className="text-slate-600 dark:text-slate-400 text-xs font-medium ml-1">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-80">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Atividade Diária</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipTextStyle} labelStyle={chartTooltipTextStyle} />
              <Line type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#F97316' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-80">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Evolução de Custos</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis orientation="right" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipTextStyle} labelStyle={chartTooltipTextStyle} />
              <Line type="monotone" dataKey="cost" stroke="#22C55E" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#22C55E' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
