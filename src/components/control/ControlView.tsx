import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { SourceDeck } from './SourceDeck'
import { ProgramView } from '../output/ProgramView'
import { SlideEditor } from '../editor/SlideEditor'
import { getDisplayStream } from '../../lib/webrtc/peer'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuid } from 'uuid'

export function ControlView({ streams, setStreams }: { streams: Map<string, MediaStream>; setStreams: React.Dispatch<React.SetStateAction<Map<string, MediaStream>>> }) {
  const sources = useAppStore((s) => s.sources)
  const previewId = useAppStore((s) => s.previewId)
  const programId = useAppStore((s) => s.programId)
  const isBlack = useAppStore((s) => s.isBlack)
  const fadeDuration = useAppStore((s) => s.fadeDuration)
  const transition = useAppStore((s) => s.transition)
  const take = useAppStore((s) => s.take)
  const cut = useAppStore((s) => s.cut)
  const setBlack = useAppStore((s) => s.setBlack)
  const setPreview = useAppStore((s) => s.setPreview)
  const updateSource = useAppStore((s) => s.updateSource)
  const setFadeDuration = useAppStore((s) => s.setFadeDuration)
  const setTransition = useAppStore((s) => s.setTransition)
  const mixer = useAppStore((s) => s.mixer)
  const setMixer = useAppStore((s) => s.setMixer)
  const roomCode = useAppStore((s) => s.roomCode)
  const setRoomCode = useAppStore((s) => s.setRoomCode)

  const [editingSlideId, setEditingSlideId] = useState<string | null>(null)
  const [peerId] = useState<string>(() => localStorage.getItem('obs-peer-id') || uuid().slice(0, 8))

  useEffect(() => {
    localStorage.setItem('obs-peer-id', peerId)
    if (!roomCode) {
      const code = Math.random().toString(36).slice(2, 6).toUpperCase()
      setRoomCode(code)
    }
  }, [])

  const preview = sources.find((s) => s.id === previewId) || null
  const program = sources.find((s) => s.id === programId) || null

  const openOutput = () => {
    const url = `${window.location.origin}${window.location.pathname}?output=1&room=${roomCode}`
    window.open(url, '_blank', 'width=1920,height=1080')
  }

  const openFullscreenOutput = () => {
    const url = `${window.location.origin}${window.location.pathname}?output=1&room=${roomCode}`
    const w = window.open(url, '_blank')
    // try to fullscreen after open - user gesture required, so also provide button in output
    if (w) w.focus()
  }

  const handleTake = () => {
    if (transition === 'fade') take()
    else cut()
  }

  const handleScreenShare = async (id: string) => {
    try {
      const stream = await getDisplayStream()
      updateSource(id, { _localStream: stream } as any)
      setStreams((prev) => new Map(prev).set(id, stream))
      setPreview(id)
      // stop handling
      stream.getVideoTracks()[0].onended = () => {
        updateSource(id, { _localStream: undefined } as any)
      }
    } catch (e) {
      alert('画面共有がキャンセルされました: ' + e)
    }
  }

  const slideEditing = sources.find((s) => s.type === 'slide' && s.id === editingSlideId) as any

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        handleTake()
      } else if (e.key.toLowerCase() === 'b') {
        setBlack(!isBlack)
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        const src = sources[idx]
        if (src) setPreview(src.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sources, isBlack, transition, previewId])

  const exportJson = () => {
    const json = useAppStore.getState().exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obs-preset-${Date.now()}.json`
    a.click()
  }
  const importRef = useRef<HTMLInputElement>(null)
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((t) => useAppStore.getState().importJson(t))
  }

  // inline editor for standby/video props
  const renderPreviewProps = () => {
    if (!preview) return null
    if (preview.type === 'standby') {
      const hasText = !!((preview as any).text?.trim() || (preview as any).subText?.trim())
      return (
        <div className="space-y-2 bg-zinc-900 p-3 rounded">
          <div className="text-sm font-bold">待機画面編集</div>
          <input
            value={(preview as any).text}
            onChange={(e) => updateSource(preview.id, { text: e.target.value } as any)}
            placeholder="メイン文（空にすると文字なしで動画のみ）"
            className="w-full bg-zinc-800 rounded px-2 py-1 text-sm"
          />
          <input
            value={(preview as any).subText || ''}
            onChange={(e) => updateSource(preview.id, { subText: e.target.value } as any)}
            placeholder="サブ文"
            className="w-full bg-zinc-800 rounded px-2 py-1 text-sm"
          />
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-xs">背景</label>
            <input type="color" value={(preview as any).bgColor || '#0f172a'} onChange={(e) => updateSource(preview.id, { bgColor: e.target.value } as any)} />
            <label className="text-xs ml-2">動画</label>
            <input
              type="file"
              accept="video/*"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const url = URL.createObjectURL(f)
                updateSource(preview.id, { url } as any)
              }}
              className="text-xs"
            />
            {(preview as any).url && (
              <button
                onClick={() => updateSource(preview.id, { url: undefined } as any)}
                className="text-xs px-2 py-1 bg-zinc-800 rounded hover:bg-red-900"
              >
                動画クリア
              </button>
            )}
          </div>
          <div className="flex gap-3 items-center bg-zinc-800/50 p-2 rounded">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={(preview as any).enableOverlay ?? true}
                onChange={(e) => updateSource(preview.id, { enableOverlay: e.target.checked } as any)}
              />
              暗幕
            </label>
            <label className="flex items-center gap-1 text-xs flex-1">
              濃さ
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.05}
                value={(preview as any).overlayOpacity ?? 0.35}
                onChange={(e) => updateSource(preview.id, { overlayOpacity: parseFloat(e.target.value) } as any)}
                disabled={!((preview as any).enableOverlay ?? true)}
                className="flex-1"
              />
              <span className="w-8 text-right">{Math.round(((preview as any).overlayOpacity ?? 0.35) * 100)}%</span>
            </label>
            <span className="text-[11px] text-zinc-500">{hasText ? '文字あり時のみ表示' : '文字なし→暗幕なしで動画100%'}</span>
          </div>
          <p className="text-[11px] text-zinc-500">ヒント: 文字を空にすると暗幕は自動で消え、動画が100%の明るさでループします。</p>
        </div>
      )
    }
    if (preview.type === 'video') {
      return (
        <div className="space-y-2 bg-zinc-900 p-3 rounded">
          <div className="text-sm font-bold">動画設定</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={(preview as any).loop} onChange={(e) => updateSource(preview.id, { loop: e.target.checked } as any)} /> ループ
          </label>
          <label className="flex items-center gap-2 text-sm">
            音量 <input type="range" min={0} max={1} step={0.05} value={(preview as any).volume} onChange={(e) => updateSource(preview.id, { volume: parseFloat(e.target.value) } as any)} />
          </label>
        </div>
      )
    }
    if (preview.type === 'slide') {
      return (
        <div className="space-y-2 bg-zinc-900 p-3 rounded">
          <div className="flex gap-2">
            <button onClick={() => setEditingSlideId(preview.id)} className="px-3 py-1 bg-sky-600 rounded text-sm">
              エディタを開く
            </button>
            <button
              onClick={() => {
                const idx = (preview as any).currentIndex
                updateSource(preview.id, { currentIndex: Math.max(0, idx - 1) } as any)
              }}
              className="px-2 py-1 bg-zinc-800 rounded text-sm"
            >
              ◀ 前
            </button>
            <span className="text-sm py-1">
              {(preview as any).currentIndex + 1} / {(preview as any).slides.length}
            </span>
            <button
              onClick={() => {
                const idx = (preview as any).currentIndex
                updateSource(preview.id, { currentIndex: Math.min((preview as any).slides.length - 1, idx + 1) } as any)
              }}
              className="px-2 py-1 bg-zinc-800 rounded text-sm"
            >
              次 ▶
            </button>
          </div>
        </div>
      )
    }
    if (preview.type === 'screen') {
      return (
        <div className="bg-zinc-900 p-3 rounded space-y-2">
          <div className="text-sm font-bold">画面共有（Canva対応）</div>
          <p className="text-xs text-zinc-400">Canvaでスライドを再生しながら「画面共有開始」でそのまま投影できます。タブ切替不要。</p>
          <button onClick={() => handleScreenShare(preview.id)} className="px-3 py-1 bg-emerald-600 rounded text-sm">
            画面共有開始
          </button>
        </div>
      )
    }
    if (preview.type === 'camera') {
      const camUrl = `${window.location.origin}${window.location.pathname}?role=camera&room=${roomCode}&target=${preview.id}&peer=${peerId}`
      return (
        <div className="bg-zinc-900 p-3 rounded space-y-2">
          <div className="text-sm font-bold">スマホカメラ</div>
          <div className="flex gap-4 items-center">
            <div className="bg-white p-2 rounded">
              <QRCodeSVG value={camUrl} size={120} />
            </div>
            <div className="text-xs space-y-1">
              <div>このQRをスマホで読み取ってください</div>
              <div className="break-all text-zinc-400">{camUrl}</div>
              <div className="text-zinc-500">Wi-Fi / モバイルデータ 両対応（TURN経由）</div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] text-zinc-100 flex flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="font-bold">OBS Lite</h1>
          <span className="text-xs bg-zinc-800 px-2 py-1 rounded">Room: {roomCode}</span>
          <span className="text-xs text-zinc-500 hidden md:inline">Space=TAKE / B=BLACK / 1-9=選択</span>
        </div>
        <div className="flex gap-2">
          <button onClick={openOutput} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
            出力ウィンドウを開く
          </button>
          <button onClick={openFullscreenOutput} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">
            全画面出力
          </button>
          <button onClick={exportJson} className="px-3 py-1 bg-zinc-800 rounded text-sm">
            保存
          </button>
          <button onClick={() => importRef.current?.click()} className="px-3 py-1 bg-zinc-800 rounded text-sm">
            読込
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={onImport} />
        </div>
      </header>

      <div className="p-3 space-y-3 flex-1">
        {/* preview/program */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-yellow-400">PREVIEW (NEXT)</div>
            <div className="aspect-video bg-black rounded overflow-hidden border border-yellow-600">
              <ProgramView program={preview} streams={streams} isBlack={false} fade={0} />
            </div>
            {preview && <div className="text-xs text-zinc-400 truncate">{preview.name} / {preview.type}</div>}
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-red-400">PROGRAM (LIVE) {isBlack && '(BLACK)'}</div>
            <div className="aspect-video bg-black rounded overflow-hidden border border-red-600">
              <ProgramView program={program} streams={streams} isBlack={isBlack} fade={transition === 'fade' ? fadeDuration : 0} />
            </div>
            {program && <div className="text-xs text-zinc-400 truncate">{program.name} / {program.type}</div>}
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-wrap gap-2 items-center bg-zinc-900 p-3 rounded">
          <button onClick={handleTake} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-bold">
            {transition === 'fade' ? 'TAKE (FADE)' : 'CUT'}
          </button>
          <button onClick={() => (transition === 'fade' ? take() : cut())} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
            CUT
          </button>
          <button onClick={() => setBlack(!isBlack)} className={`px-4 py-2 rounded text-sm ${isBlack ? 'bg-red-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
            BLACK
          </button>
          <div className="h-6 w-px bg-zinc-700" />
          <label className="flex items-center gap-1 text-xs">
            方式
            <select value={transition} onChange={(e) => setTransition(e.target.value as any)} className="bg-zinc-800 rounded px-1 py-1">
              <option value="cut">CUT</option>
              <option value="fade">FADE</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs">
            FADE
            <input type="range" min={0} max={2000} step={100} value={fadeDuration} onChange={(e) => setFadeDuration(parseInt(e.target.value))} />
            {fadeDuration}ms
          </label>
          <div className="h-6 w-px bg-zinc-700" />
          <label className="flex items-center gap-1 text-xs">
            Master
            <input type="range" min={0} max={1} step={0.05} value={mixer.masterVolume} onChange={(e) => setMixer({ masterVolume: parseFloat(e.target.value) })} />
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={mixer.muted} onChange={(e) => setMixer({ muted: e.target.checked })} /> MUTE
          </label>
        </div>

        <SourceDeck />

        {renderPreviewProps()}

        {slideEditing && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="flex justify-between p-2 bg-zinc-900">
              <div className="font-bold">スライドエディタ: {slideEditing.name}</div>
              <button onClick={() => setEditingSlideId(null)} className="px-3 py-1 bg-zinc-800 rounded">
                閉じる
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SlideEditor source={slideEditing} onChange={(patch: any) => updateSource(slideEditing.id, patch)} />
            </div>
          </div>
        )}
      </div>

      <footer className="text-[11px] text-zinc-600 p-2 text-center border-t border-zinc-900">OBS Lite for プレゼン/予餞会 — 出力ウィンドウをプロジェクターに全画面表示してください。Canvaは「画面共有」ソースでそのまま映せます。</footer>
    </div>
  )
}
