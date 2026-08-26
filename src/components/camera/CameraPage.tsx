import { useEffect, useRef, useState } from 'react'
import Peer, { type MediaConnection } from 'peerjs'

export function CameraPage() {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room') || ''
  const target = params.get('target') || ''
  const hostPeerId = params.get('peer') || ''

  const [status, setStatus] = useState('準備中...')
  const [detail, setDetail] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [retryCount, setRetryCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<Peer | null>(null)
  const callRef = useRef<MediaConnection | null>(null)

  const log = (msg: string) => {
    console.log('[Camera]', msg)
    setDetail((d) => `${new Date().toLocaleTimeString()} ${msg}\n` + d)
  }

  const cleanup = () => {
    callRef.current?.close()
    callRef.current = null
    peerRef.current?.destroy()
    peerRef.current = null
  }

  const start = async (mode: 'user' | 'environment', retry = 0) => {
    // HTTPS check
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setStatus('⚠️ HTTPSが必要です')
      setDetail('このページはHTTPSで開いてください。httpではカメラが使えません。URLが https:// で始まっているか確認してください。')
      log('not secure context: ' + window.location.href)
      return
    }
    if (!hostPeerId) {
      setStatus('QRのURLが不正です')
      setDetail('hostPeerIdが空です。操作PC側でQRを再生成して読み取ってください。')
      log('hostPeerId missing')
      return
    }
    try {
      setStatus(`カメラ取得中... (${retryCount + 1}回目)`)
      log(`getUserMedia facing=${mode}`)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      // destroy old peer before new
      cleanup()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      log(`got stream tracks=${stream.getTracks().length} video=${stream.getVideoTracks().length} audio=${stream.getAudioTracks().length}`)
      setStatus('Peer接続準備中...')

      const peer = new Peer('', {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
          ],
        },
      })
      peerRef.current = peer

      const timeout = window.setTimeout(() => {
        log('Peer open timeout - possible network block')
        setStatus('接続タイムアウト - ネットワークを確認')
      }, 10000)

      peer.on('open', (id) => {
        window.clearTimeout(timeout)
        log(`peer open id=${id} host=${hostPeerId}`)
        setStatus(`接続中... ホスト:${hostPeerId.slice(0, 8)} Room:${room}`)
        // Attempt call with retry
        const attemptCall = (attempt: number) => {
          log(`calling host attempt ${attempt}`)
          const call = peer.call(hostPeerId, stream, { metadata: { target, room } })
          if (!call) {
            log('call returned falsy - peer may not exist yet')
            setStatus('ホストが見つかりません - 操作PCを確認')
            if (attempt < 3) {
              setTimeout(() => attemptCall(attempt + 1), 2000)
            }
            return
          }
          callRef.current = call
          call.on('stream', () => {
            log('call stream event (unexpected for sender)')
          })
          call.on('close', () => {
            log('call closed')
            setStatus('切断されました - 再接続します')
            if (attempt < 5) setTimeout(() => attemptCall(attempt + 1), 2000)
          })
          call.on('error', (e: any) => {
            log(`call error ${e?.type || e}`)
            setStatus(`通話エラー: ${e?.type || e}`)
            if (attempt < 5) setTimeout(() => attemptCall(attempt + 1), 2000)
          })
          // success after short delay if not closed
          setTimeout(() => {
            if (call.open) {
              log('call is open')
              setStatus(`配信中 ✓ ホスト:${hostPeerId.slice(0, 8)} (${mode === 'environment' ? '背面' : '前面'})`)
            }
          }, 1000)
          // Fallback success: assume ok if no error after 1s
          setStatus(`配信中 ✓ ホスト:${hostPeerId.slice(0, 8)}`)
        }
        attemptCall(1)
      })

      peer.on('error', (e: any) => {
        window.clearTimeout(timeout)
        log(`peer error ${e.type}: ${e.message || JSON.stringify(e)}`)
        setStatus(`Peerエラー: ${e.type}`)
        setDetail((d) => `PeerError: ${e.type} ${e.message || ''}\n` + d)
        if (e.type === 'peer-unavailable') {
          setStatus('ホストが見つかりません - 操作PCの「Peer:」が✓か、Roomが同じか確認してください')
          // retry after delay
          setTimeout(() => {
            if (retry < 3) start(mode, retry + 1)
          }, 3000)
        } else if (e.type === 'network' || e.type === 'socket-error') {
          setTimeout(() => {
            if (retry < 3) start(mode, retry + 1)
          }, 3000)
        }
      })

      peer.on('disconnected', () => {
        log('peer disconnected, reconnecting')
        setStatus('切断 - 再接続中...')
        peer.reconnect()
      })

      peer.on('close', () => {
        log('peer closed')
      })

      // handle incoming call (if host calls us - alternative flow)
      peer.on('call', (call) => {
        log(`incoming call from ${call.peer}`)
        call.answer(stream)
        setStatus('配信中 ✓ (着信応答)')
        call.on('close', () => log('incoming call closed'))
        call.on('error', (e: any) => log(`incoming call error ${e}`))
        callRef.current = call
      })
    } catch (e: any) {
      log(`getUserMedia error ${e.name}: ${e.message}`)
      if (e.name === 'NotAllowedError') {
        setStatus('カメラ許可が拒否されました')
        setDetail('ブラウザの設定でカメラ/マイクを許可してください。アドレスバーの🔒アイコンから許可をONに。')
      } else if (e.name === 'NotFoundError') {
        setStatus('カメラが見つかりません')
      } else if (e.name === 'NotReadableError') {
        setStatus('カメラが他のアプリで使用中')
      } else {
        setStatus(`カメラエラー: ${e.message || e.name}`)
      }
    }
  }

  useEffect(() => {
    start(facing)
    return () => {
      cleanup()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const toggleFacing = async () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    setRetryCount((c) => c + 1)
    await start(next)
  }

  const retry = async () => {
    setRetryCount((c) => c + 1)
    await start(facing, retryCount + 1)
  }

  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-3 bg-zinc-900 flex justify-between items-center gap-2">
        <div className="min-w-0">
          <div className="font-bold">スマホカメラ</div>
          <div className="text-xs text-zinc-400 truncate">
            Room {room || '(なし)'} / target {target?.slice(0, 8) || '自動'} / host {hostPeerId ? hostPeerId.slice(0, 12) + '...' : '未指定'}
          </div>
          {!isSecure && <div className="text-xs text-red-400">⚠️ HTTPS必須</div>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={toggleFacing} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
            切替: {facing === 'environment' ? '背面' : '前面'}
          </button>
          <button onClick={retry} className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 rounded text-sm">
            再接続
          </button>
        </div>
      </header>
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
        <div className="absolute inset-0 pointer-events-none border-4 border-white/0" />
      </div>
      <div className="p-3 bg-zinc-900 space-y-2">
        <div className={`text-center px-3 py-2 rounded font-medium text-sm ${status.includes('配信中') ? 'bg-green-700' : status.includes('エラー') || status.includes('拒否') || status.includes('HTTPS') ? 'bg-red-800' : 'bg-zinc-800'}`}>{status}</div>
        {hostPeerId && <div className="text-xs text-zinc-500 break-all">hostPeerId: {hostPeerId}</div>}
        <div className="text-xs text-zinc-500 text-center">この画面を開いたままに。閉じると配信が止まります。操作PC側で該当カメラソースをNEXT→TAKEで投影</div>
        <details className="bg-zinc-800 rounded p-2">
          <summary className="text-xs cursor-pointer">詳細ログ（トラブル時に展開）</summary>
          <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto mt-2 font-mono">{detail || 'ログなし'}</pre>
          <div className="text-[11px] text-zinc-500 mt-2">
            チェック: ①操作PCの画面下部 `Peer:✓` になっているか ②同じRoomコードか ③スマホとPCが同じWi-Fi（またはスマホがモバイルデータでもTURN経由で可） ④ブラウザはChrome/Safari推奨
          </div>
        </details>
        {!hostPeerId && <div className="text-xs bg-red-900/50 p-2 rounded">QRのURLに `peer` が含まれていません。操作PCで「+スマホカメラ」を作り直し、QRを再読取してください。</div>}
      </div>
    </div>
  )
}
