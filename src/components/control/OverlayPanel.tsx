import { useAppStore, storeBlobForSource } from '../../stores/useAppStore'
import { v4 as uuid } from 'uuid'
import { useState } from 'react'

export function OverlayPanel(_props: { streams: Map<string, MediaStream> }) {
  const sources = useAppStore((s) => s.sources)
  const pips = useAppStore((s) => s.pips)
  const telop = useAppStore((s) => s.telop)
  const addPip = useAppStore((s) => s.addPip)
  const updatePip = useAppStore((s) => s.updatePip)
  const removePip = useAppStore((s) => s.removePip)
  const setTelop = useAppStore((s) => s.setTelop)
  const [dragId, setDragId] = useState<string | null>(null)

  const addPipForSource = (sourceId: string) => {
    const id = uuid()
    addPip({
      id,
      sourceId,
      enabled: true,
      x: 60,
      y: 60,
      width: 30,
      height: 30,
      rotation: 0,
      opacity: 1,
      shape: 'rect',
      borderRadius: 8,
      zIndex: pips.length + 10,
    })
  }

  const onTelopFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const { blobId, url } = await storeBlobForSource('telop', f)
    setTelop({ imageUrl: url, blobId, enabled: true } as any)
  }

  // simple drag handler for PIPs in preview canvas
  const onCanvasMouseDown = (e: React.MouseEvent, pipId: string) => {
    e.preventDefault()
    setDragId(pipId)
    const pip = pips.find((p) => p.id === pipId)
    if (!pip) return
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const origX = pip.x
    const origY = pip.y
    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      updatePip(pipId, { x: Math.max(0, Math.min(85, origX + dx)), y: Math.max(0, Math.min(85, origY + dy)) })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragId(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="space-y-4 bg-zinc-900 p-3 rounded">
      <div className="font-bold text-sm">透過テロップ & PIP自由変形</div>

      {/* Telop */}
      <div className="bg-zinc-800 p-3 rounded space-y-2">
        <div className="text-xs font-bold flex justify-between">
          <span>常時テロップ（透過PNG）</span>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={telop.enabled} onChange={(e) => setTelop({ enabled: e.target.checked })} /> 有効
          </label>
        </div>
        <p className="text-[11px] text-zinc-400">中身をくり抜いた透過PNG（例: 1920x1080フレーム）をアップロード。PIP動画がくり抜き部分から見えるように重なります。</p>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="px-3 py-1 bg-sky-700 hover:bg-sky-600 rounded text-xs cursor-pointer">
            PNGを選択
            <input type="file" accept="image/png,image/webp" className="hidden" onChange={onTelopFile} />
          </label>
          {telop.imageUrl && <img src={telop.imageUrl} alt="telop preview" className="h-12 border border-zinc-600 rounded bg-black/50" />}
          {telop.imageUrl && (
            <button onClick={() => setTelop({ imageUrl: undefined, blobId: undefined, enabled: false } as any)} className="text-xs px-2 py-1 bg-zinc-700 rounded">
              クリア
            </button>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <label className="text-xs flex items-center gap-1 flex-1">
            不透明度
            <input type="range" min={0} max={1} step={0.05} value={telop.opacity} onChange={(e) => setTelop({ opacity: parseFloat(e.target.value) })} className="flex-1" />
            {Math.round(telop.opacity * 100)}%
          </label>
          <label className="text-xs flex items-center gap-1 flex-1">
            拡大
            <input type="range" min={0.8} max={1.2} step={0.02} value={telop.scale} onChange={(e) => setTelop({ scale: parseFloat(e.target.value) })} className="flex-1" />
            {telop.scale.toFixed(2)}x
          </label>
        </div>
      </div>

      {/* PIPs */}
      <div className="bg-zinc-800 p-3 rounded space-y-2">
        <div className="text-xs font-bold flex justify-between">
          <span>PIPオーバーレイ（自由変形）</span>
          <span className="text-zinc-500">{pips.length}件</span>
        </div>
        <p className="text-[11px] text-zinc-400">動画/カメラ/画面共有を小さくしてテロップのくり抜き位置に合わせられます。ドラッグで移動、スライダーで変形。</p>
        <div className="flex gap-1 flex-wrap">
          {sources
            .filter((s) => ['video', 'camera', 'screen', 'image'].includes(s.type))
            .map((s) => (
              <button key={s.id} onClick={() => addPipForSource(s.id)} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
                + {s.name}
              </button>
            ))}
          <button
            onClick={() => {
              if (confirm('全PIPを削除しますか？')) {
                pips.forEach((p) => removePip(p.id))
              }
            }}
            className="px-2 py-1 bg-red-900 rounded text-xs"
          >
            全削除
          </button>
        </div>

        {/* Visual canvas for PIP positioning */}
        {pips.length > 0 && (
          <div className="relative bg-black rounded overflow-hidden border border-zinc-700" style={{ aspectRatio: '16/9' }}>
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs pointer-events-none">プレビュー（ドラッグで移動）</div>
            {telop.enabled && telop.imageUrl && <img src={telop.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ opacity: telop.opacity * 0.5 }} />}
            {pips.map((pip) => {
              const s = sources.find((x) => x.id === pip.sourceId)
              return (
                <div
                  key={pip.id}
                  onMouseDown={(e) => onCanvasMouseDown(e, pip.id)}
                  className={`absolute border-2 flex items-center justify-center text-[10px] select-none cursor-move ${dragId === pip.id ? 'border-sky-400' : 'border-yellow-400'} ${pip.enabled ? '' : 'opacity-40'}`}
                  style={{
                    left: `${pip.x}%`,
                    top: `${pip.y}%`,
                    width: `${pip.width}%`,
                    height: `${pip.height}%`,
                    transform: `rotate(${pip.rotation}deg)`,
                    opacity: pip.opacity,
                    borderRadius: pip.shape === 'circle' ? '50%' : pip.shape === 'rounded' ? `${pip.borderRadius}%` : '4px',
                    background: '#111',
                    zIndex: pip.zIndex,
                  }}
                >
                  <span className="bg-black/60 px-1 rounded text-white truncate">{s?.name || pip.sourceId}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* PIP list controls */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {pips.map((pip) => {
            return (
              <div key={pip.id} className="bg-zinc-700 p-2 rounded space-y-1">
                <div className="flex justify-between items-center">
                  <select value={pip.sourceId} onChange={(e) => updatePip(pip.id, { sourceId: e.target.value })} className="bg-zinc-800 rounded text-xs px-1 py-1 flex-1 mr-2">
                    {sources
                      .filter((s) => ['video', 'camera', 'screen', 'image', 'slide'].includes(s.type))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.type})
                        </option>
                      ))}
                  </select>
                  <label className="text-xs flex items-center gap-1">
                    <input type="checkbox" checked={pip.enabled} onChange={(e) => updatePip(pip.id, { enabled: e.target.checked })} /> 表示
                  </label>
                  <button onClick={() => removePip(pip.id)} className="ml-2 px-2 py-1 bg-red-800 rounded text-xs">
                    削除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    X
                    <input type="range" min={0} max={80} value={pip.x} onChange={(e) => updatePip(pip.id, { x: parseFloat(e.target.value) })} className="flex-1" />
                    {pip.x.toFixed(0)}%
                  </label>
                  <label className="flex items-center gap-1">
                    Y
                    <input type="range" min={0} max={80} value={pip.y} onChange={(e) => updatePip(pip.id, { y: parseFloat(e.target.value) })} className="flex-1" />
                    {pip.y.toFixed(0)}%
                  </label>
                  <label className="flex items-center gap-1">
                    W
                    <input type="range" min={5} max={80} value={pip.width} onChange={(e) => updatePip(pip.id, { width: parseFloat(e.target.value) })} className="flex-1" />
                    {pip.width.toFixed(0)}%
                  </label>
                  <label className="flex items-center gap-1">
                    H
                    <input type="range" min={5} max={80} value={pip.height} onChange={(e) => updatePip(pip.id, { height: parseFloat(e.target.value) })} className="flex-1" />
                    {pip.height.toFixed(0)}%
                  </label>
                  <label className="flex items-center gap-1">
                    回転
                    <input type="range" min={-180} max={180} value={pip.rotation} onChange={(e) => updatePip(pip.id, { rotation: parseFloat(e.target.value) })} className="flex-1" />
                    {pip.rotation}°
                  </label>
                  <label className="flex items-center gap-1">
                    不透明
                    <input type="range" min={0} max={1} step={0.05} value={pip.opacity} onChange={(e) => updatePip(pip.id, { opacity: parseFloat(e.target.value) })} className="flex-1" />
                    {Math.round(pip.opacity * 100)}%
                  </label>
                </div>
                <div className="flex gap-2 items-center text-xs">
                  <label>
                    形状
                    <select value={pip.shape} onChange={(e) => updatePip(pip.id, { shape: e.target.value as any })} className="ml-1 bg-zinc-800 rounded px-1">
                      <option value="rect">四角</option>
                      <option value="rounded">角丸</option>
                      <option value="circle">丸</option>
                    </select>
                  </label>
                  {pip.shape === 'rounded' && (
                    <label className="flex items-center gap-1">
                      丸み
                      <input type="range" min={0} max={50} value={pip.borderRadius} onChange={(e) => updatePip(pip.id, { borderRadius: parseFloat(e.target.value) })} />
                      {pip.borderRadius}%
                    </label>
                  )}
                  <label className="flex items-center gap-1">
                    Z
                    <input type="number" value={pip.zIndex} onChange={(e) => updatePip(pip.id, { zIndex: parseInt(e.target.value) })} className="w-12 bg-zinc-800 rounded px-1" />
                  </label>
                </div>
              </div>
            )
          })}
          {pips.length === 0 && <div className="text-xs text-zinc-500 text-center py-2">PIPなし — 上のボタンで追加してください</div>}
        </div>
      </div>
    </div>
  )
}
