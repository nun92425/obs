import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'

export function CameraPage() {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room') || ''
  const target = params.get('target') || ''
  const hostPeerId = params.get('peer') || ''

  const [status, setStatus] = useState('準備中...')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<Peer | null>(null)

  const start = async (mode: 'user' | 'environment') => {
    try {
      setStatus('カメラ取得中...')
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Peer setup
      const peer = new Peer('', {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          ],
        },
      })
      peerRef.current = peer
      peer.on('open', () => {
        setStatus(`接続中... (Room ${room})`)
        // call host
        if (hostPeerId) {
          const call = peer.call(hostPeerId, stream, { metadata: { target, room } })
          call?.on('close', () => setStatus('切断されました'))
          call?.on('error', (e) => setStatus('エラー: ' + e))
          setStatus('配信中 ✓ ホスト: ' + hostPeerId)
        } else {
          setStatus('待機中: ホストPeerIDが見つかりません。URLを確認してください')
        }
      })
      peer.on('error', (e) => setStatus('Peerエラー: ' + e.type))
      // also handle incoming call (in case host calls us)
      peer.on('call', (call) => {
        call.answer(stream)
        setStatus('配信中 ✓ (着信応答)')
      })
    } catch (e: any) {
      setStatus('カメラエラー: ' + (e.message || e))
    }
  }

  useEffect(() => {
    start(facing)
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      peerRef.current?.destroy()
    }
  }, [])

  const toggleFacing = async () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    await start(next)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-3 bg-zinc-900 flex justify-between items-center">
        <div>
          <div className="font-bold">スマホカメラ</div>
          <div className="text-xs text-zinc-400">Room {room} / target {target || '未指定'}</div>
        </div>
        <button onClick={toggleFacing} className="px-3 py-1 bg-zinc-800 rounded text-sm">
          切替: {facing === 'environment' ? '背面' : '前面'}
        </button>
      </header>
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
        {!streamRef.current && <div className="absolute text-zinc-500">カメラ起動中...</div>}
      </div>
      <div className="p-3 bg-zinc-900 text-center text-sm">
        <div className={`inline-block px-3 py-1 rounded ${status.includes('配信中') ? 'bg-green-700' : 'bg-zinc-800'}`}>{status}</div>
        <div className="text-xs text-zinc-500 mt-2">この画面を開いたままにしてください。閉じると配信が止まります。</div>
      </div>
    </div>
  )
}
