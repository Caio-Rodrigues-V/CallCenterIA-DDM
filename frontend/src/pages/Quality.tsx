// frontend/src/pages/Quality.tsx
import React, { useEffect, useState } from 'react'
import { Award, Star, ThumbsUp, AlertCircle, BrainCircuit, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useRealtimeRefresh } from '../services/realtime'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

const chartTooltipStyle = {
  backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC', borderRadius: '4px', fontSize: '12px',
}
const chartTooltipTextStyle = { color: '#F8FAFC' }

export const Quality: React.FC = () => {
  const [metrics, setMetrics] = useState<any>({ nps_score: 0, avg_rating: 0, promoters: 0, detractors: 0, total_rated: 0, promoters_percent: 0, detractors_percent: 0 })
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([])
  const [campaignQuality, setCampaignQuality] = useState<any[]>([])
  const [topObjections, setTopObjections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetch4 = async () => {
    try {
      setLoading(true)
      const [m, d, c, o] = await Promise.all([
        fetch(`${API}/api/quality/metrics`).then(r => r.json()),
        fetch(`${API}/api/quality/rating-distribution`).then(r => r.json()),
        fetch(`${API}/api/quality/by-campaign`).then(r => r.json()),
        fetch(`${API}/api/quality/top-objections`).then(r => r.json()),
      ])
      if (m) setMetrics(m)
      if (d) setRatingDistribution(d)
      if (c) setCampaignQuality(c)
      if (o) setTopObjections(o)
    } catch (error) {
      console.error('[Quality] erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch4()
  }, [])
  useRealtimeRefresh(['quality:changed', 'calls:changed'], () => fetch4())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 dark:text-slate-400">Carregando dados de qualidade...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Promoter Score</p>
            <h3 className={`text-4xl font-bold mt-1 font-mono ${metrics.nps_score >= 50 ? 'text-green-500' : metrics.nps_score >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>{metrics.nps_score}</h3>
            <p className="text-xs text-slate-500 mt-1">{metrics.total_rated} avaliações</p>
          </div>
          <div className={`absolute right-0 top-0 h-full w-1 ${metrics.nps_score >= 50 ? 'bg-green-500' : metrics.nps_score >= 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-slate-600">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rating Médio</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{metrics.avg_rating}</h3>
            <p className="text-xs text-slate-500 mt-1">De 0 a 10</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-orange-500" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-md flex items-center justify-center text-primary">
            <Star className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Promotores</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{metrics.promoters}</h3>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">{metrics.promoters_percent}% do total</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-green-500" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center justify-center text-green-600">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detratores</p>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{metrics.detractors}</h3>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{metrics.detractors_percent}% do total</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center text-red-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-96">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Distribuição de Ratings</h3>
          <p className="text-xs text-slate-500 mb-6 font-mono">CLASSIFICAÇÃO QUALITATIVA</p>
          <div className="flex h-full pb-8">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={ratingDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {ratingDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipTextStyle} labelStyle={chartTooltipTextStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-3 w-[40%]">
              {ratingDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-96">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Score por Campanha</h3>
          <p className="text-xs text-slate-500 mb-6 font-mono">MÉDIA DE AVALIAÇÕES (0-100)</p>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={campaignQuality} margin={{ top: 10, right: 10, bottom: 40, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10, fill: '#64748B' }} stroke="none" />
              <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipTextStyle} labelStyle={chartTooltipTextStyle} />
              <Bar dataKey="score" fill="#F97316" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        <div className="bg-surface dark:bg-dark-surface p-8 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 text-[10px] font-bold uppercase tracking-wider mb-2">
              <BrainCircuit className="w-3.5 h-3.5" /> IA Analysis
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inteligência Qualitativa</h2>
            <p className="text-slate-500 text-sm mt-2">Decodificação automática de comportamento e categorização semântica.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-3">
                <ThumbsUp className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="text-slate-900 dark:text-white font-bold text-sm">Análise de Sentimento</h4>
              <p className="text-xs text-slate-500 mt-1">Baseado em avaliações das chamadas</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mb-3">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              <h4 className="text-slate-900 dark:text-white font-bold text-sm">Clusterização</h4>
              <p className="text-xs text-slate-500 mt-1">Agrupamento por motivo de término</p>
            </div>
          </div>
        </div>
        <div className="bg-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-800 rounded-lg p-8 flex flex-col gap-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-l-2 border-orange-500 pl-3">Objection Ranking</h3>
          <div className="space-y-5 flex-1 overflow-y-auto max-h-[250px]">
            {topObjections.length > 0 ? topObjections.map((objection, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-end text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">"{objection.objection}"</span>
                  <span className="font-mono font-bold text-orange-600">{objection.occurrences} oc.</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full" style={{ width: `${(objection.occurrences / topObjections[0].occurrences) * 100}%` }} />
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-32 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-sm">Nenhuma objeção encontrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
