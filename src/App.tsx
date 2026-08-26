import { useEffect, useState } from 'react'
import { useAppStore } from './stores/useAppStore'
import { ControlView } from './components/control/ControlView'
import { ProgramView } from './components/output/ProgramView'
import { CameraPage } from './components/camera/CameraPage'
import { useBroadcastSync } from './lib/sync/broadcastSync'
import { useWsSync } from './lib/sync/wsSync'
import Peer from 'peerjs'

function OutputPage({ streams }: { streams: Map<string, MediaStream> }) {
  const programId = useAppStore((s) => s.programId)
  const sources = useAppStore((s) => s.sources)
  const isBlack = useAppStore((s) => s.isBlack)
  const fadeDuration = useAppStore((s) => s.fadeDuration)
  const transition = useAppStore((s) => s.transition)
  const program = sources.find((s) => s.id === programId)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  // 全画面時はUIを自動で隠す（マウス停止2秒で非表示）
  const [showUi, setShowUi] = useState(true)
  useEffect(() => {
    let t: number | undefined
    const onMove = () => {
      setShowUi(true)
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        if (document.fullscreenElement) setShowUi(false)
      }, 2000)
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.clearTimeout(t)
    }
  }, [])

  return (
    <div className="w-screen h-screen bg-black flex flex-col cursor-none has-[button:hover]:cursor-auto" onClick={toggleFullscreen}>
      <div className="flex-1 relative overflow-hidden">
        <ProgramView program={program} streams={streams} isBlack={isBlack} fade={transition === 'fade' ? fadeDuration : 0} />
        {showUi && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFullscreen()
            }}
            className="absolute bottom-4 right-4 px-3 py-1 bg-black/40 hover:bg-black/70 text-white/70 hover:text-white rounded text-xs border border-white/10 backdrop-blur"
          >
            {document.fullscreenElement ? '全画面解除' : '全画面'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const hydrated = useAppStore((s) => s._hydrated)
  const hydrate = useAppStore((s) => s.hydrate)
  const programId = useAppStore((s) => s.programId)
  const previewId = useAppStore((s) => s.previewId)
  const previewIds = useAppStore((s) => s.previewIds)
  const activePreviewIndex = useAppStore((s) => s.activePreviewIndex)
  const isBlack = useAppStore((s) => s.isBlack)
  const roomCode = useAppStore((s) => s.roomCode)
  const [streams, setStreams] = useState<Map<string, MediaStream>>(new Map())
  const [peerReady, setPeerReady] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const isOutput = params.has('output')
  const isCamera = params.get('role') === 'camera'

  // sync hooks
  useBroadcastSync()
  const wsEnabled = !!roomCode && !isCamera
  const { status: wsStatus, sendProgram, sendFullSync } = useWsSync(wsEnabled, roomCode)
  const pips = useAppStore((s) => s.pips)
  const telop = useAppStore((s) => s.telop)
  const lowerThird = useAppStore((s) => s.lowerThird)
  const clock = useAppStore((s) => s.clock)
  const mixer = useAppStore((s) => s.mixer)

  // hydrate
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // broadcast via ws when program changes (control only)
  useEffect(() => {
    if (isOutput || isCamera) return
    if (wsStatus !== 'connected') return
    sendProgram(programId, isBlack, previewId, previewIds, activePreviewIndex)
  }, [programId, isBlack, previewId, JSON.stringify(previewIds), activePreviewIndex, wsStatus, isOutput, isCamera])

  // broadcast full sync when overlays change (for remote output)
  useEffect(() => {
    if (isOutput || isCamera) return
    if (wsStatus !== 'connected') return
    sendFullSync()
  }, [JSON.stringify(pips), JSON.stringify(telop), JSON.stringify(lowerThird), JSON.stringify(clock), JSON.stringify(mixer), wsStatus])

  // setup host peer for camera reception
  useEffect(() => {
    if (isCamera || isOutput) return
    const peerId = localStorage.getItem('obs-peer-id') || ''
    if (!peerId) return
    const peer = new Peer(peerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        ],
      },
    })
    peer.on('open', () => setPeerReady(true))
    peer.on('call', async (call) => {
      // answer without stream, receive only
      call.answer()
      call.on('stream', (remoteStream) => {
        const target = (call.metadata?.target as string) || call.peer
        // find camera source by id, or first camera source
        const sources = useAppStore.getState().sources
        let camId = target
        if (!sources.find((s) => s.id === camId)) {
          const cam = sources.find((s) => s.type === 'camera')
          if (cam) camId = cam.id
        }
        setStreams((prev) => {
          const next = new Map(prev)
          next.set(camId, remoteStream)
          return next
        })
        // auto-preview if no preview?
        // store mapping for render
        // also patch source to remember peer
        const st = useAppStore.getState()
        st.updateSource(camId, { peerId: call.peer } as any)
      })
    })
    return () => {
      peer.destroy()
    }
  }, [isCamera, isOutput, hydrated])

  if (!hydrated) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">読み込み中...</div>
  }

  if (isCamera) {
    return <CameraPage />
  }
  if (isOutput) {
    return <OutputPage streams={streams} />
  }
  return (
    <div>
      <ControlView streams={streams} setStreams={setStreams} />
      <div className="fixed bottom-2 left-2 text-[10px] bg-zinc-900 text-zinc-500 px-2 py-1 rounded border border-zinc-800">
        Peer:{peerReady ? '✓' : '…'} WS:{wsStatus} {wsStatus === 'connected' ? '(別PC同期ON)' : wsStatus === 'connecting' ? '(接続中)' : '(ローカル)'}
      </div>
    </div>
  )
}
