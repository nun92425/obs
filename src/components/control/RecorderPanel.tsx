import { useRef, useState } from 'react'

export function RecorderPanel() {
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const start = async () => {
    try {
      // capture the output window if available, else fallback to screen
      const stream = await (navigator.mediaDevices as any).getDisplayMedia ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) : await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
      chunks.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' })
        setUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
    } catch (e: any) {
      alert('録画開始失敗: ' + e.message)
    }
  }
  const stop = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="bg-zinc-900 p-3 rounded space-y-2">
      <div className="text-sm font-bold">録画（出力キャプチャ）</div>
      <p className="text-[11px] text-zinc-400">画面共有の録画と同様に、出力内容をWebMで保存できます。</p>
      <div className="flex gap-2">
        {!recording ? (
          <button onClick={start} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm">
            ● 録画開始
          </button>
        ) : (
          <button onClick={stop} className="px-3 py-1 bg-zinc-700 rounded text-sm">
            ■ 停止
          </button>
        )}
        {url && (
          <a href={url} download={`obs-recording-${Date.now()}.webm`} className="px-3 py-1 bg-sky-700 rounded text-sm">
            ダウンロード
          </a>
        )}
      </div>
      {recording && <div className="text-xs text-red-400 animate-pulse">● 録画中...</div>}
    </div>
  )
}
