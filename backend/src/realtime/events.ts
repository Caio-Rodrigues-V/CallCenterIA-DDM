import type { Server } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { redis } from '../lib/redis.js'

const REALTIME_CHANNEL = 'callcenter:realtime'

export type RealtimeEventType =
  | 'campaigns:changed'
  | 'contacts:changed'
  | 'calls:changed'
  | 'reports:changed'
  | 'quality:changed'
  | 'logs:changed'

export interface RealtimeEvent {
  type: RealtimeEventType
  payload?: Record<string, unknown>
  ts: string
}

const publisher = redis.duplicate()

export async function publishRealtimeEvent(
  type: RealtimeEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const event: RealtimeEvent = { type, payload, ts: new Date().toISOString() }

  try {
    await publisher.publish(REALTIME_CHANNEL, JSON.stringify(event))
  } catch (error) {
    console.error('[realtime] erro ao publicar evento:', error)
  }
}

export function setupRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' })
  const subscriber = redis.duplicate()

  const broadcast = (event: RealtimeEvent) => {
    const message = JSON.stringify(event)
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({
      type: 'logs:changed',
      payload: { connected: true },
      ts: new Date().toISOString(),
    } satisfies RealtimeEvent))
  })

  subscriber.subscribe(REALTIME_CHANNEL).catch((error) => {
    console.error('[realtime] erro ao assinar canal:', error)
  })

  subscriber.on('message', (_channel, rawMessage) => {
    try {
      broadcast(JSON.parse(rawMessage) as RealtimeEvent)
    } catch (error) {
      console.error('[realtime] evento invalido:', error)
    }
  })

  wss.on('listening', () => {
    console.log('[realtime] websocket ativo em /ws')
  })
}
