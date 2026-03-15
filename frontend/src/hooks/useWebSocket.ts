import { useEffect, useRef, useCallback, useState } from 'react'
import type { WebSocketMessage } from '../types'

type MessageHandler = (msg: WebSocketMessage) => void

interface UseWebSocketOptions {
  onMessage: MessageHandler
  onOpen?: () => void
  onClose?: (code: number) => void
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { onMessage, onOpen, onClose } = options
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelayRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [statusText, setStatusText] = useState('Connecting...')

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectDelayRef.current = 0
      setStatus('connected')
      setStatusText('Loading...')
      onOpen?.()
    }

    ws.onclose = (event) => {
      setStatus('disconnected')
      if (event.code === 1006) {
        setStatusText('Lost connection!')
      } else {
        setStatusText('Disconnected due to error.')
      }
      onClose?.(event.code)
      scheduleReconnect()
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as WebSocketMessage
        onMessage(payload)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // close handler will handle reconnect
    }
  }, [onMessage, onOpen, onClose])

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer()
    wsRef.current = null

    reconnectDelayRef.current++
    let delay = Math.min(reconnectDelayRef.current * reconnectDelayRef.current, 30)

    reconnectTimerRef.current = setInterval(() => {
      delay--
      if (delay <= 0) {
        clearReconnectTimer()
        setStatusText('Reconnecting...')
        connect()
      } else {
        setStatusText(`Reconnecting in ${delay}s...`)
      }
    }, 1000)
  }, [clearReconnectTimer, connect])

  const send = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearReconnectTimer()
      wsRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { send, status, statusText }
}
