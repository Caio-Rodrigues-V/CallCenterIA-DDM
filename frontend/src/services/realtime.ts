import { useEffect, useRef } from 'react'

export type RealtimeEventType =
  | 'campaigns:changed'
  | 'contacts:changed'
  | 'calls:changed'
  | 'reports:changed'
  | 'quality:changed'
  | 'logs:changed'

interface RealtimeEvent {
  type: RealtimeEventType
  payload?: Record<string, unknown>
  ts: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const getWebSocketUrl = (): string => {
  const baseUrl = API_BASE_URL || window.location.origin
  const url = new URL(baseUrl, window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function useRealtimeRefresh(
  eventTypes: RealtimeEventType[],
  onRefresh: (event: RealtimeEvent) => void,
): void {
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    let retryTimer: number | undefined
    let socket: WebSocket | undefined
    let closedByEffect = false

    const connect = () => {
      socket = new WebSocket(getWebSocketUrl())

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent
          if (eventTypes.includes(event.type)) {
            refreshRef.current(event)
          }
        } catch (error) {
          console.error('[realtime] evento inválido:', error)
        }
      }

      socket.onclose = () => {
        if (!closedByEffect) {
          retryTimer = window.setTimeout(connect, 3000)
        }
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      closedByEffect = true
      if (retryTimer) window.clearTimeout(retryTimer)
      socket?.close()
    }
  }, [eventTypes.join('|')])
}
