import { useAppStore, storeBlobForSource } from '../../stores/useAppStore'
import { v4 as uuid } from 'uuid'

export function BgmPanel() {
  const sources = useAppStore((s) => s.sources)
  const mixer = useAppStore((s) => s.mixer)
  const setMixer = useAppStore((s) => s.setMixer)
  const addSource = useAppStore((s) => s.addSource)
  const removeSource = useAppStore((s) => s.removeSource)
  const updateSource = useAppStore((s) => s.updateSource)
  const bgms = sources.filter((s) => s.type === 'bgm') as any[]

  const onAddBgm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      const id = uuid()
      const { blobId, url } = await storeBlobForSource(id, file)
      addSource({ id, type: 'bgm', name: file.name, url, fileName: file.name, loop: true, volume: 0.7, blobId } as any)
    }
    e.target.value = ''
  }

  return (
    <div className="bg-zinc-900 p-3 rounded space-y-2">
      <div className="text-sm font-bold">BGM（常時再生）</div>
      <p className="text-[11px] text-zinc-400">待機中やスライド中に流しっぱなし。Program切替に関係なく再生されます。複数登録可。</p>
      <div className="flex gap-2 items-center flex-wrap">
        <label className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs cursor-pointer">
          + BGM追加（mp3/wav）
          <input type="file" accept="audio/*" multiple className="hidden" onChange={onAddBgm} />
        </label>
        <label className="text-xs flex items-center gap-1">
          BGM音量
          <input type="range" min={0} max={1} step={0.05} value={mixer.bgmVolume} onChange={(e) => setMixer({ bgmVolume: parseFloat(e.target.value) })} />
          {Math.round(mixer.bgmVolume * 100)}%
        </label>
      </div>
      <div className="space-y-1">
        {bgms.map((bgm) => (
          <div key={bgm.id} className="flex items-center gap-2 bg-zinc-800 p-2 rounded text-xs">
            <span className="flex-1 truncate">{bgm.name}</span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={bgm.loop} onChange={(e) => updateSource(bgm.id, { loop: e.target.checked } as any)} /> ループ
            </label>
            <input type="range" min={0} max={1} step={0.05} value={bgm.volume} onChange={(e) => updateSource(bgm.id, { volume: parseFloat(e.target.value) } as any)} className="w-20" />
            <button onClick={() => removeSource(bgm.id)} className="px-2 py-1 bg-red-900 rounded">
              削除
            </button>
          </div>
        ))}
        {bgms.length === 0 && <div className="text-xs text-zinc-500">BGMなし</div>}
      </div>
    </div>
  )
}
