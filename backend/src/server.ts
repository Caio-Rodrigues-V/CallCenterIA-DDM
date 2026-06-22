import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { env } from './config/env.js'
import { campaignsRouter } from './routes/campaigns.js'
import { callsRouter } from './routes/calls.js'
import { contactsRouter } from './routes/contacts.js'
import { webhooksRouter } from './routes/webhooks.js'
import { AppError } from './errors/AppError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors({ origin: env.frontendOrigin }))
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'callcenter-ddm-api', ts: new Date().toISOString() })
})

app.use('/api/campaigns', campaignsRouter)
app.use('/api/calls', callsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/webhooks', webhooksRouter)

const staticDir = path.resolve(__dirname, '../public')
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next()
    res.sendFile(path.join(staticDir, 'index.html'))
  })
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      context: error.context,
    })
  }

  console.error('[server] erro não tratado:', error)
  res.status(500).json({ success: false, error: 'Erro interno do servidor' })
})

app.listen(env.port, () => {
  console.log(`[server] rodando em http://localhost:${env.port}`)
})

export default app