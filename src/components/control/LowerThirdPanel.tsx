import { useAppStore } from '../../stores/useAppStore'

export function LowerThirdPanel() {
  const lt = useAppStore((s) => s.lowerThird)
  const setLowerThird = useAppStore((s) => s.setLowerThird)
  return (
    <div className="bg-zinc-900 p-3 rounded space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold">ローワーサード（常時テロップ文字）</div>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={lt.enabled} onChange={(e) => setLowerThird({ enabled: e.target.checked })} /> 表示
        </label>
      </div>
      <input value={lt.text} onChange={(e) => setLowerThird({ text: e.target.value })} placeholder="メイン（例: 次の演目）" className="w-full bg-zinc-800 rounded px-2 py-1 text-sm" />
      <input value={lt.subText} onChange={(e) => setLowerThird({ subText: e.target.value })} placeholder="サブ（例: 3年1組 合唱）" className="w-full bg-zinc-800 rounded px-2 py-1 text-sm" />
      <div className="flex gap-2 items-center flex-wrap text-xs">
        <label>
          位置
          <select value={lt.position} onChange={(e) => setLowerThird({ position: e.target.value as any })} className="ml-1 bg-zinc-800 rounded px-1 py-1">
            <option value="bottom">下</option>
            <option value="top">上</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          背景濃さ
          <input type="range" min={0} max={1} step={0.05} value={lt.bgOpacity} onChange={(e) => setLowerThird({ bgOpacity: parseFloat(e.target.value) })} />
          {Math.round(lt.bgOpacity * 100)}%
        </label>
        <label className="flex items-center gap-1">
          アクセント
          <input type="color" value={lt.accentColor} onChange={(e) => setLowerThird({ accentColor: e.target.value })} />
        </label>
      </div>
    </div>
  )
}
