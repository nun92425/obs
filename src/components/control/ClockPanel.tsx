import { useAppStore } from '../../stores/useAppStore'
import { useEffect, useState } from 'react'

export function ClockPanel() {
  const clock = useAppStore((s) => s.clock)
  const setClock = useAppStore((s) => s.setClock)
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="bg-zinc-900 p-3 rounded space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold">時計 / タイマー</div>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={clock.enabled} onChange={(e) => setClock({ enabled: e.target.checked })} /> 表示
        </label>
      </div>
      <div className="flex gap-2 text-xs">
        <select value={clock.mode} onChange={(e) => setClock({ mode: e.target.value as any })} className="bg-zinc-800 rounded px-1 py-1">
          <option value="clock">現在時刻</option>
          <option value="timer">ストップウォッチ</option>
          <option value="countdown">カウントダウン</option>
        </select>
        {clock.mode === 'countdown' && (
          <label className="flex items-center gap-1">
            秒数
            <input type="number" value={clock.countdownSec} onChange={(e) => setClock({ countdownSec: parseInt(e.target.value) || 0 })} className="w-20 bg-zinc-800 rounded px-1" />
          </label>
        )}
      </div>
      {clock.mode !== 'clock' ? (
        <div className="flex gap-2 items-center text-xs">
          <button onClick={() => setClock({ timerRunning: !clock.timerRunning, timerSec: clock.mode === 'countdown' ? clock.countdownSec : clock.timerSec })} className="px-3 py-1 bg-sky-700 rounded">
            {clock.timerRunning ? '停止' : '開始'}
          </button>
          <button onClick={() => setClock({ timerRunning: false, timerSec: clock.mode === 'countdown' ? clock.countdownSec : 0 })} className="px-3 py-1 bg-zinc-800 rounded">
            リセット
          </button>
        </div>
      ) : (
        <div className="text-xs text-zinc-400">現在時刻 {now.toLocaleTimeString('ja-JP')} を出力画面右上に表示</div>
      )}
      {clock.mode === 'clock' && <div className="text-xs text-zinc-400">現在時刻を出力画面右上に表示</div>}
    </div>
  )
}
