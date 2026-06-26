import React, { useEffect, useState } from 'react'
import { Card, Badge } from '../components/ui'
import { Database, Link2, Zap } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

export const Settings: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    fetch(`${API}/health`)
      .then(res => res.ok ? setApiStatus('ok') : setApiStatus('error'))
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Backend API</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Status da conexão com o servidor</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-300">Status</span>
          <Badge variant={apiStatus === 'ok' ? 'success' : apiStatus === 'error' ? 'danger' : 'neutral'}>
            {apiStatus === 'checking' ? 'Verificando...' : apiStatus === 'ok' ? 'Conectado' : 'Erro'}
          </Badge>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Link2 className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Integração n8n</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configurado via variável de ambiente</p>
          </div>
        </div>
        <Badge variant="success">Ativo</Badge>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Zap className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">VAPI</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configurado via variável de ambiente</p>
          </div>
        </div>
        <Badge variant="success">Ativo</Badge>
      </Card>
    </div>
  )
}
