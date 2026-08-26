import { useRef } from 'react'
import { useAppStore, storeBlobForSource } from '../../stores/useAppStore'
import { v4 as uuid } from 'uuid'

export function SourceDeck() {
  const sources = useAppStore((s) => s.sources)
  const previewId = useAppStore((s) => s.previewId)
  const programId = useAppStore((s) => s.programId)
  const addSource = useAppStore((s) => s.addSource)
  const setPreview = useAppStore((s) => s.setPreview)
  const removeSource = useAppStore((s) => s.removeSource)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileTypeRef = useRef<'video' | 'image'>('video')

  const onAddVideo = () => {
    fileTypeRef.current = 'video'
    fileInputRef.current?.click()
  }
  const onAddImage = () => {
    fileTypeRef.current = 'image'
    fileInputRef.current?.click()
  }
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      const id = uuid()
      const isVideo = file.type.startsWith('video') || fileTypeRef.current === 'video'
      if (isVideo) {
        const { blobId, url } = await storeBlobForSource(id, file)
        addSource({ id, type: 'video', name: file.name, url, fileName: file.name, loop: false, volume: 1, blobId } as any)
      } else {
        const { blobId, url } = await storeBlobForSource(id, file)
        addSource({ id, type: 'image', name: file.name, url, fileName: file.name, blobId } as any)
      }
    }
    e.target.value = ''
  }

  const onAddSlide = () => {
    const id = uuid()
    addSource({
      id,
      type: 'slide',
      name: `スライド ${sources.filter((s) => s.type === 'slide').length + 1}`,
      slides: [
        {
          id: uuid(),
          bg: '#0f172a',
          transition: 'fade',
          elements: [
            {
              id: uuid(),
              type: 'text',
              x: 10,
              y: 35,
              width: 80,
              height: 20,
              rotation: 0,
              text: 'タイトルを入力',
              fontSize: 48,
              color: '#ffffff',
              anim: 'fadeIn',
              animDuration: 600,
              animDelay: 0,
            },
          ],
        },
      ],
      currentIndex: 0,
    } as any)
  }

  const onAddStandby = () => {
    const id = uuid()
    addSource({ id, type: 'standby', name: '待機ループ', text: 'まもなく開演します', subText: 'しばらくお待ちください', bgColor: '#0f172a' } as any)
  }

  const onAddCamera = () => {
    const id = uuid()
    addSource({ id, type: 'camera', name: `スマホ ${sources.filter((s) => s.type === 'camera').length + 1}` } as any)
  }

  const onAddScreen = () => {
    const id = uuid()
    addSource({ id, type: 'screen', name: `画面共有 ${sources.filter((s) => s.type === 'screen').length + 1}` } as any)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={onAddVideo} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
          + 動画
        </button>
        <button onClick={onAddImage} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
          + 画像
        </button>
        <button onClick={onAddSlide} className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 rounded text-sm">
          + スライド作成
        </button>
        <button onClick={onAddScreen} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded text-sm">
          + 画面共有
        </button>
        <button onClick={onAddCamera} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-sm">
          + スマホカメラ
        </button>
        <button onClick={onAddStandby} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
          + 待機画面
        </button>
        <input ref={fileInputRef} type="file" accept="video/*,image/*" multiple className="hidden" onChange={onFileChange} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {sources.map((src) => {
          const isPreview = src.id === previewId
          const isProgram = src.id === programId
          return (
            <div
              key={src.id}
              onClick={() => setPreview(src.id)}
              className={`relative group rounded overflow-hidden border-2 cursor-pointer bg-zinc-900 aspect-video flex flex-col items-center justify-center p-2 text-center
                ${isProgram ? 'border-red-500' : isPreview ? 'border-yellow-400' : 'border-zinc-700 hover:border-zinc-500'}`}
            >
              <div className="absolute top-1 left-1 flex gap-1">
                {isProgram && <span className="text-[10px] bg-red-600 text-white px-1 rounded">LIVE</span>}
                {isPreview && <span className="text-[10px] bg-yellow-500 text-black px-1 rounded">NEXT</span>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`削除しますか？ ${src.name}`)) removeSource(src.id)
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded text-xs opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
              <div className="text-xs font-medium truncate w-full">{src.name}</div>
              <div className="text-[10px] text-zinc-400 uppercase">{src.type}</div>
              {src.type === 'video' && (src as any).url && (
                <video src={(src as any).url} muted className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />
              )}
              {src.type === 'image' && (src as any).url && (
                <img src={(src as any).url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-zinc-500">クリックでNEXT（黄）にセット → CUT/TAKEでLIVE（赤）へ送出。タブ切替なし。</p>
    </div>
  )
}
