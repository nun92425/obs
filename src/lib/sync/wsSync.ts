import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'

type WsMessage = { type: string; payload?: any }

export function useWsSync(enabled: boolean, roomCode: string | null) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled || !roomCode) {
      setStatus('disconnected')
      return
    }
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    // Try env var, fallback to same host
    const envUrl = (import.meta as any).env?.VITE_SIGNALING_URL as string | undefined
    let url: string
    if (envUrl) {
      url = `${envUrl.replace(/\/$/, '')}/?room=${roomCode}`
    } else {
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1') {
        url = `ws://localhost:3001?room=${roomCode}`
      } else if (host === 'obs-signaling.onrender.com') {
        url = `${proto}://${host}?room=${roomCode}`
      } else {
        // Render 静的サイト (obs-pfq1.onrender.com) からは本番シグナリングに接続
        // 環境変数未設定でも動くようにフォールバック
        url = `wss://obs-signaling.onrender.com?room=${roomCode}`
      }
    }

    setStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      // send full sync from control
      const isControl = !new URLSearchParams(window.location.search).has('output')
      if (isControl) {
        const state = useAppStore.getState()
        ws.send(JSON.stringify({ type: 'FULL_SYNC', payload: JSON.parse(state.exportJson()) }))
      } else {
        ws.send(JSON.stringify({ type: 'REQUEST_SYNC' }))
      }
    }
    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data)
        if (msg.type === 'PROGRAM') {
          const { programId, isBlack, previewId, previewIds, activePreviewIndex } = msg.payload
          const cur = useAppStore.getState()
          const nextIds = previewIds ?? (previewId !== undefined ? [previewId, null, null] : cur.previewIds)
          useAppStore.setState({ programId, isBlack, previewId, previewIds: nextIds, activePreviewIndex: activePreviewIndex ?? 0 } as any)
        } else if (msg.type === 'FULL_SYNC') {
          const p = msg.payload
          const previewIds = p.previewIds ?? (p.previewId ? [p.previewId, null, null] : undefined)
          useAppStore.setState({
            sources: p.sources,
            programId: p.programId,
            previewId: p.previewId,
            previewIds: previewIds ?? useAppStore.getState().previewIds,
            activePreviewIndex: p.activePreviewIndex ?? 0,
            isBlack: p.isBlack ?? false,
            fadeDuration: p.fadeDuration,
            transition: p.transition,
            mixer: p.mixer ?? useAppStore.getState().mixer,
            pips: p.pips ?? [],
            telop: p.telop ?? useAppStore.getState().telop,
            lowerThird: p.lowerThird ?? useAppStore.getState().lowerThird,
            clock: p.clock ?? useAppStore.getState().clock,
            playlistAutoAdvance: p.playlistAutoAdvance ?? false,
          } as any)
        } else if (msg.type === 'REQUEST_SYNC') {
          const state = useAppStore.getState()
          ws.send(JSON.stringify({ type: 'FULL_SYNC', payload: JSON.parse(state.exportJson()) }))
        }
      } catch {}
    }
    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('disconnected')

    return () => {
      ws.close()
    }
  }, [enabled, roomCode])

  const sendProgram = (programId: string | null, isBlack: boolean, previewId: string | null, previewIds?: (string | null)[], activePreviewIndex?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PROGRAM', payload: { programId, isBlack, previewId, previewIds, activePreviewIndex } }))
    }
  }
  const sendFullSync = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = JSON.parse(useAppStore.getState().exportJson())
      payload.isBlack = useAppStore.getState().isBlack
      wsRef.current.send(JSON.stringify({ type: 'FULL_SYNC', payload }))
    }
  }

  return { status, sendProgram, sendFullSync }
}
