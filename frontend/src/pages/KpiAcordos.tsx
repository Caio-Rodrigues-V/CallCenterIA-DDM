// frontend/src/pages/KpiAcordos.tsx
// Página temporariamente desabilitada — tabelas vw_acordos_kpis e acordos_formalizados
// não existem no schema atual. Exibe mensagem informativa.
import React from 'react'
import { BarChart3 } from 'lucide-react'

export const KpiAcordos: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-full">
        <BarChart3 className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">KPIs de Acordos</h2>
      <p className="text-slate-500 text-sm text-center max-w-md">
        Esta página depende das tabelas <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">vw_acordos_kpis</code> e{' '}
        <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">acordos_formalizados</code> que ainda não foram migradas para o novo schema.
      </p>
    </div>
  )
}
