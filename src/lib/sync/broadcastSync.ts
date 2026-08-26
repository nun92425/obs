import { useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/useAppStore'

const CHANNEL_NAME = 'obs-sync-v2'

type SyncMessage =
  | { type: 'PROGRAM'; programId: string | null; isBlack: boolean; previewId: string | null }
  | { type: 'REQUEST_SYNC' }
  | { type: 'FULL_SYNC'; payload: any }

export function useBroadcastSync() {
  const programId = useAppStore((s) => s.programId)
  const previewId = useAppStore((s) => s.previewId)
  const isBlack = useAppStore((s) => s.isBlack)
  const pips = useAppStore((s) => s.pips)
  const telop = useAppStore((s) => s.telop)
  const lowerThird = useAppStore((s) => s.lowerThird)
  const clock = useAppStore((s) => s.clock)
  const mixer = useAppStore((s) => s.mixer)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = ch

    ch.onmessage = (ev: MessageEvent<SyncMessage>) => {
      const msg = ev.data
      if (msg.type === 'PROGRAM') {
        const cur = useAppStore.getState()
        if (cur.programId !== msg.programId || cur.isBlack !== msg.isBlack || cur.previewId !== msg.previewId) {
          cur.setPreview(msg.previewId)
          useAppStore.setState({ programId: msg.programId, isBlack: msg.isBlack, previewId: msg.previewId })
        }
      } else if (msg.type === 'REQUEST_SYNC') {
        const full = useAppStore.getState().exportJson()
        const payload = JSON.parse(full)
        payload.isBlack = useAppStore.getState().isBlack
        ch.postMessage({ type: 'FULL_SYNC', payload } as SyncMessage)
      } else if (msg.type === 'FULL_SYNC') {
        const p = msg.payload
        useAppStore.setState({
          sources: p.sources,
          programId: p.programId,
          previewId: p.previewId,
          isBlack: p.isBlack ?? false,
          fadeDuration: p.fadeDuration,
          transition: p.transition,
          mixer: p.mixer,
          pips: p.pips ?? [],
          telop: p.telop,
          lowerThird: p.lowerThird,
          clock: p.clock,
          playlistAutoAdvance: p.playlistAutoAdvance,
        })
      }
    }

    const isOutput = new URLSearchParams(window.location.search).has('output')
    if (isOutput) {
      ch.postMessage({ type: 'REQUEST_SYNC' })
    }

    return () => ch.close()
  }, [])

  // broadcast on program change (only from control)
  useEffect(() => {
    if (!channelRef.current) return
    const isOutput = new URLSearchParams(window.location.search).has('output')
    if (isOutput) return
    channelRef.current.postMessage({ type: 'PROGRAM', programId, isBlack, previewId } as SyncMessage)
  }, [programId, isBlack, previewId])

  // broadcast full sync when overlays/extra state change (control only)
  useEffect(() => {
    if (!channelRef.current) return
    const isOutput = new URLSearchParams(window.location.search).has('output')
    if (isOutput) return
    const payload = JSON.parse(useAppStore.getState().exportJson())
    payload.isBlack = useAppStore.getState().isBlack
    channelRef.current.postMessage({ type: 'FULL_SYNC', payload } as SyncMessage)
  }, [JSON.stringify(pips), JSON.stringify(telop), JSON.stringify(lowerThird), JSON.stringify(clock), JSON.stringify(mixer)])
}

export function broadcastFullSync() {
  const ch = new BroadcastChannel(CHANNEL_NAME)
  const store = useAppStore.getState()
  const full = store.exportJson()
  const payload = JSON.parse(full)
  // isBlack is not in export, add
  payload.isBlack = store.isBlack
  ch.postMessage({ type: 'FULL_SYNC', payload } as any)
  setTimeout(() => ch.close(), 100)
}
