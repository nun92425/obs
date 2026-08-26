import { useState } from 'react'
import { Stage, Layer, Rect, Text, Circle, Image as KonvaImage } from 'react-konva'
import { v4 as uuid } from 'uuid'
import type { SlideDeckSource, SlideElement } from '../../types/scene'
import useImage from 'use-image'

// small hook to load image
function LoadedImage({ url, ...props }: any) {
  const [img] = useImage(url || '', 'anonymous')
  if (!img) return null
  return <KonvaImage image={img} {...props} />
}

export function SlideEditor({ source, onChange }: { source: SlideDeckSource; onChange: (patch: any) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const currentSlide = source.slides[source.currentIndex]
  const selectedEl = currentSlide?.elements.find((e) => e.id === selectedId)

  const updateElement = (id: string, patch: Partial<SlideElement>) => {
    const slides = source.slides.map((sl, idx) => {
      if (idx !== source.currentIndex) return sl
      return { ...sl, elements: sl.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) }
    })
    onChange({ slides })
  }

  const addText = () => {
    const el: SlideElement = {
      id: uuid(),
      type: 'text',
      x: 20,
      y: 30,
      width: 60,
      height: 20,
      rotation: 0,
      text: 'テキスト',
      fontSize: 32,
      color: '#ffffff',
      bg: 'transparent',
      anim: 'fadeIn',
      animDuration: 500,
      animDelay: 0,
    }
    const slides = [...source.slides]
    slides[source.currentIndex] = { ...currentSlide, elements: [...currentSlide.elements, el] }
    onChange({ slides })
  }
  const addShape = (shapeType: 'rect' | 'circle') => {
    const el: SlideElement = {
      id: uuid(),
      type: 'shape',
      x: 30,
      y: 40,
      width: 20,
      height: 20,
      rotation: 0,
      color: '#e11d48',
      shapeType,
      anim: 'pop',
      animDuration: 500,
      animDelay: 0,
    }
    const slides = [...source.slides]
    slides[source.currentIndex] = { ...currentSlide, elements: [...currentSlide.elements, el] }
    onChange({ slides })
  }
  const addImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const el: SlideElement = {
      id: uuid(),
      type: 'image',
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      rotation: 0,
      url,
      anim: 'zoomIn',
      animDuration: 600,
      animDelay: 0,
    }
    const slides = [...source.slides]
    slides[source.currentIndex] = { ...currentSlide, elements: [...currentSlide.elements, el] }
    onChange({ slides })
  }
  const removeSelected = () => {
    if (!selectedId) return
    const slides = [...source.slides]
    slides[source.currentIndex] = { ...currentSlide, elements: currentSlide.elements.filter((el) => el.id !== selectedId) }
    onChange({ slides })
    setSelectedId(null)
  }
  const addSlide = () => {
    const newSlide = { id: uuid(), bg: '#0f172a', transition: 'fade' as const, elements: [] }
    onChange({ slides: [...source.slides, newSlide], currentIndex: source.slides.length })
  }
  const duplicateSlide = () => {
    const copy = JSON.parse(JSON.stringify(currentSlide))
    copy.id = uuid()
    const slides = [...source.slides]
    slides.splice(source.currentIndex + 1, 0, copy)
    onChange({ slides, currentIndex: source.currentIndex + 1 })
  }
  const deleteSlide = () => {
    if (source.slides.length <= 1) return alert('最後の1枚は削除できません')
    const slides = source.slides.filter((_, i) => i !== source.currentIndex)
    onChange({ slides, currentIndex: Math.max(0, source.currentIndex - 1) })
  }

  if (!currentSlide) return <div>スライドなし</div>

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      {/* left */}
      <div className="w-48 bg-zinc-900 border-r border-zinc-800 p-2 space-y-2 overflow-y-auto">
        <div className="text-xs font-bold">スライド</div>
        <div className="space-y-1">
          {source.slides.map((sl, i) => (
            <div
              key={sl.id}
              onClick={() => onChange({ currentIndex: i })}
              className={`p-2 rounded cursor-pointer border text-xs ${i === source.currentIndex ? 'bg-sky-800 border-sky-600' : 'bg-zinc-800 border-zinc-700'}`}
            >
              {i + 1}. {sl.elements.length}要素
              <div className="h-12 mt-1 rounded" style={{ background: sl.bg }} />
            </div>
          ))}
        </div>
        <button onClick={addSlide} className="w-full py-1 bg-zinc-800 rounded text-xs">
          + 追加
        </button>
        <div className="flex gap-1">
          <button onClick={duplicateSlide} className="flex-1 py-1 bg-zinc-800 rounded text-xs">
            複製
          </button>
          <button onClick={deleteSlide} className="flex-1 py-1 bg-red-900 rounded text-xs">
            削除
          </button>
        </div>
        <div className="pt-2 border-t border-zinc-800 space-y-1">
          <div className="text-xs font-bold">追加</div>
          <button onClick={addText} className="w-full py-1 bg-zinc-800 rounded text-xs">
            テキスト
          </button>
          <button onClick={() => addShape('rect')} className="w-full py-1 bg-zinc-800 rounded text-xs">
            四角
          </button>
          <button onClick={() => addShape('circle')} className="w-full py-1 bg-zinc-800 rounded text-xs">
            丸
          </button>
          <label className="block w-full py-1 bg-zinc-800 rounded text-xs text-center cursor-pointer">
            画像
            <input type="file" accept="image/*" className="hidden" onChange={addImage} />
          </label>
        </div>
        <div className="pt-2">
          <label className="text-xs">背景色</label>
          <input
            type="color"
            value={currentSlide.bg}
            onChange={() => {}}
            onChangeCapture={(e: any) => {
              const slides = [...source.slides]
              slides[source.currentIndex] = { ...currentSlide, bg: e.target.value }
              onChange({ slides })
            }}
            className="w-full h-8"
          />
        </div>
      </div>

      {/* center canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-950 overflow-auto">
        <div className="bg-black rounded overflow-hidden shadow-xl" style={{ width: 960, height: 540 }}>
          <Stage
            width={960}
            height={540}
            onClick={(e) => {
              const clickedOnEmpty = e.target === e.target.getStage()
              if (clickedOnEmpty) setSelectedId(null)
            }}
          >
            <Layer>
              <Rect width={960} height={540} fill={currentSlide.bg} />
              {currentSlide.elements.map((el) => {
                const isSelected = el.id === selectedId
                const common = {
                  x: (el.x / 100) * 960,
                  y: (el.y / 100) * 540,
                  width: (el.width / 100) * 960,
                  height: (el.height / 100) * 540,
                  rotation: el.rotation,
                  draggable: true,
                  onClick: () => setSelectedId(el.id),
                  onDragEnd: (evt: any) => {
                    const nx = (evt.target.x() / 960) * 100
                    const ny = (evt.target.y() / 540) * 100
                    updateElement(el.id, { x: nx, y: ny })
                  },
                  stroke: isSelected ? '#38bdf8' : undefined,
                  strokeWidth: isSelected ? 2 : 0,
                }
                if (el.type === 'text') {
                  return (
                    <Text
                      key={el.id}
                      {...common}
                      text={el.text || ''}
                      fontSize={el.fontSize || 32}
                      fill={el.color || '#fff'}
                      align="center"
                      verticalAlign="middle"
                    />
                  )
                }
                if (el.type === 'shape') {
                  if (el.shapeType === 'circle') {
                    return <Circle key={el.id} {...common} x={common.x + common.width / 2} y={common.y + common.height / 2} radius={common.width / 2} fill={el.color || '#fff'} stroke={isSelected ? '#38bdf8' : undefined} />
                  }
                  return <Rect key={el.id} {...common} fill={el.color || '#fff'} cornerRadius={8} />
                }
                if (el.type === 'image' && el.url) {
                  return <LoadedImage key={el.id} url={el.url} {...common} />
                }
                return null
              })}
            </Layer>
          </Stage>
        </div>
        <div className="text-xs text-zinc-500 mt-2">ドラッグで移動 / 要素クリックで選択</div>
      </div>

      {/* right props */}
      <div className="w-72 bg-zinc-900 border-l border-zinc-800 p-3 space-y-3 overflow-y-auto">
        {!selectedEl ? (
          <div className="text-sm text-zinc-500">要素を選択してください</div>
        ) : (
          <>
            <div className="text-sm font-bold">プロパティ</div>
            {selectedEl.type === 'text' && (
              <>
                <textarea
                  value={selectedEl.text || ''}
                  onChange={(e) => updateElement(selectedEl.id, { text: e.target.value })}
                  className="w-full bg-zinc-800 rounded p-2 text-sm"
                  rows={3}
                />
                <label className="text-xs flex items-center gap-2">
                  サイズ
                  <input type="range" min={12} max={96} value={selectedEl.fontSize || 32} onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) })} />
                  {selectedEl.fontSize}
                </label>
                <label className="text-xs flex items-center gap-2">
                  色 <input type="color" value={selectedEl.color || '#ffffff'} onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })} />
                </label>
              </>
            )}
            {selectedEl.type === 'shape' && (
              <label className="text-xs flex items-center gap-2">
                色 <input type="color" value={selectedEl.color || '#ffffff'} onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })} />
              </label>
            )}
            <label className="text-xs flex items-center gap-2">
              アニメ
              <select value={selectedEl.anim} onChange={(e) => updateElement(selectedEl.id, { anim: e.target.value as any })} className="bg-zinc-800 rounded px-1 py-1">
                <option value="none">なし</option>
                <option value="fadeIn">フェードイン</option>
                <option value="slideInLeft">スライド左</option>
                <option value="slideInRight">スライド右</option>
                <option value="zoomIn">ズームイン</option>
                <option value="pop">ポップ</option>
              </select>
            </label>
            <label className="text-xs flex items-center gap-2">
              秒数 <input type="range" min={100} max={2000} step={100} value={selectedEl.animDuration} onChange={(e) => updateElement(selectedEl.id, { animDuration: parseInt(e.target.value) })} /> {selectedEl.animDuration}ms
            </label>
            <label className="text-xs flex items-center gap-2">
              遅延 <input type="range" min={0} max={2000} step={100} value={selectedEl.animDelay} onChange={(e) => updateElement(selectedEl.id, { animDelay: parseInt(e.target.value) })} /> {selectedEl.animDelay}ms
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label>
                X%
                <input type="number" value={Math.round(selectedEl.x)} onChange={(e) => updateElement(selectedEl.id, { x: parseFloat(e.target.value) })} className="w-full bg-zinc-800 rounded px-1" />
              </label>
              <label>
                Y%
                <input type="number" value={Math.round(selectedEl.y)} onChange={(e) => updateElement(selectedEl.id, { y: parseFloat(e.target.value) })} className="w-full bg-zinc-800 rounded px-1" />
              </label>
              <label>
                W%
                <input type="number" value={Math.round(selectedEl.width)} onChange={(e) => updateElement(selectedEl.id, { width: parseFloat(e.target.value) })} className="w-full bg-zinc-800 rounded px-1" />
              </label>
              <label>
                H%
                <input type="number" value={Math.round(selectedEl.height)} onChange={(e) => updateElement(selectedEl.id, { height: parseFloat(e.target.value) })} className="w-full bg-zinc-800 rounded px-1" />
              </label>
            </div>
            <button onClick={removeSelected} className="w-full py-1 bg-red-900 rounded text-sm">
              削除
            </button>
          </>
        )}
      </div>
    </div>
  )
}
