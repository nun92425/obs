import { useEffect, useRef, useState } from 'react'
import type { Source, PipOverlay } from '../../types/scene'
import { useAppStore } from '../../stores/useAppStore'

function VideoOutput({ src, volume, onEnded }: { src: any; volume: number; onEnded?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.volume = volume
      ref.current.play().catch(() => {})
    }
  }, [src.url, volume])
  return (
    <video
      ref={ref}
      src={src.url}
      autoPlay
      loop={src.loop}
      playsInline
      muted={volume === 0}
      onEnded={onEnded}
      className="w-full h-full object-contain bg-black"
    />
  )
}

function ImageOutput({ src }: { src: any }) {
  return <img src={src.url} alt={src.name} className="w-full h-full object-contain bg-black" />
}

function SlideOutput({ src }: { src: any }) {
  const slide = src.slides[src.currentIndex] || src.slides[0]
  if (!slide) return <div className="w-full h-full bg-black" />
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: slide.bg || '#000' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInLeft { from { opacity:0; transform: translateX(-50px) } to { opacity:1; transform: translateX(0) } }
        @keyframes slideInRight { from { opacity:0; transform: translateX(50px) } to { opacity:1; transform: translateX(0) } }
        @keyframes zoomIn { from { opacity:0; transform: scale(0.8) } to { opacity:1; transform: scale(1) } }
        @keyframes pop { 0% { opacity:0; transform: scale(0.5) } 60% { transform: scale(1.1) } 100% { opacity:1; transform: scale(1) } }
      `}</style>
      {slide.elements.map((el: any) => {
        const animMap: Record<string, string> = {
          fadeIn: 'fadeIn',
          slideInLeft: 'slideInLeft',
          slideInRight: 'slideInRight',
          zoomIn: 'zoomIn',
          pop: 'pop',
        }
        const animName = animMap[el.anim] || ''
        let style: any = {
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.width}%`,
          height: `${el.height}%`,
          transform: `rotate(${el.rotation}deg)`,
          background: el.bg || 'transparent',
          color: el.color || '#fff',
          fontSize: `${el.fontSize || 24}px`,
          fontWeight: el.fontWeight || '400',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animation: animName ? `${animName} ${el.animDuration}ms ease ${el.animDelay}ms both` : undefined,
        }
        return (
          <div key={`${slide.id}-${el.id}`} style={style}>
            {el.type === 'text' ? (
              <span style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>{el.text}</span>
            ) : el.type === 'image' && el.url ? (
              <img src={el.url} alt="" className="w-full h-full object-contain" />
            ) : el.type === 'shape' ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: el.color || '#fff',
                  borderRadius: el.shapeType === 'circle' ? '50%' : '8px',
                }}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function StandbyOutput({ src }: { src: any }) {
  const hasText = !!(src.text?.trim() || src.subText?.trim())
  const overlayOpacity = src.overlayOpacity ?? 0.35
  const enableOverlay = src.enableOverlay ?? true
  const showOverlay = hasText && enableOverlay && overlayOpacity > 0
  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      {src.url ? (
        <>
          <video src={src.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
          {showOverlay && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: src.bgColor || '#0f172a' }} />
      )}
      {hasText && (
        <div className="relative z-10 text-center p-8">
          {src.text?.trim() && <h1 className="text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] mb-4">{src.text}</h1>}
          {src.subText?.trim() && <p className="text-xl text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">{src.subText}</p>}
        </div>
      )}
    </div>
  )
}

function CameraOutput({ src, streams }: { src: any; streams: Map<string, MediaStream> }) {
  const stream = streams.get(src.id) || streams.get(src.peerId) || (src as any)._localStream
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
      ref.current.play().catch(() => {})
    }
  }, [stream])
  if (!stream) return <div className="w-full h-full bg-black flex items-center justify-center text-white/60">カメラ待機中... ({src.name})</div>
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-contain bg-black" />
}

function ScreenOutput({ src }: { src: any }) {
  const stream = (src as any)._localStream as MediaStream | undefined
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream
      ref.current.play().catch(() => {})
    }
  }, [stream])
  if (!stream) return <div className="w-full h-full bg-black flex items-center justify-center text-white/60">画面共有待機中</div>
  return <video ref={ref} autoPlay playsInline muted className="w-full h-full object-contain bg-black" />
}

function AudioOutput({ src, volume }: { src: any; volume: number }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.volume = volume
      ref.current.play().catch(() => {})
    }
  }, [src.url, volume])
  return <audio ref={ref} src={src.url} autoPlay loop={src.loop} className="hidden" />
}

function PipRenderer({ pip, source, streams, volume }: { pip: PipOverlay; source?: Source; streams: Map<string, MediaStream>; volume: number }) {
  if (!pip.enabled || !source) return null
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${pip.x}%`,
    top: `${pip.y}%`,
    width: `${pip.width}%`,
    height: `${pip.height}%`,
    transform: `rotate(${pip.rotation}deg)`,
    opacity: pip.opacity,
    zIndex: pip.zIndex,
    overflow: 'hidden',
    borderRadius: pip.shape === 'circle' ? '50%' : pip.shape === 'rounded' ? `${pip.borderRadius}%` : '0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    background: '#000',
  }
  let inner: React.ReactNode = null
  if (source.type === 'video') inner = <VideoOutput src={source} volume={volume} />
  else if (source.type === 'image') inner = <ImageOutput src={source} />
  else if (source.type === 'camera') inner = <CameraOutput src={source} streams={streams} />
  else if (source.type === 'screen') inner = <ScreenOutput src={source} />
  else if (source.type === 'slide') inner = <SlideOutput src={source} />
  else inner = <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-white/50">{source.name}</div>

  return <div style={style}>{inner}</div>
}

function LowerThirdView({ lt }: { lt: any }) {
  if (!lt.enabled) return null
  const pos = lt.position === 'top' ? 'top-6' : 'bottom-6'
  return (
    <div className={`absolute ${pos} left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-6 py-3 rounded-lg backdrop-blur-md border`} style={{ background: `rgba(0,0,0,${lt.bgOpacity})`, borderColor: lt.accentColor, maxWidth: '80%' }}>
      <div className="w-1.5 h-10 rounded-full" style={{ background: lt.accentColor }} />
      <div>
        <div className="text-white font-bold text-xl leading-tight">{lt.text}</div>
        {lt.subText && <div className="text-white/80 text-sm">{lt.subText}</div>}
      </div>
    </div>
  )
}

function ClockView({ clock }: { clock: any }) {
  const [now, setNow] = useState(new Date())
  const [secs, setSecs] = useState(clock.timerSec)
  useEffect(() => {
    if (clock.mode === 'clock') {
      const t = setInterval(() => setNow(new Date()), 1000)
      return () => clearInterval(t)
    }
  }, [clock.mode])
  useEffect(() => {
    setSecs(clock.timerSec)
  }, [clock.timerSec])
  useEffect(() => {
    if (!clock.timerRunning || clock.mode === 'clock') return
    const t = setInterval(() => {
      setSecs((s: number) => {
        if (clock.mode === 'countdown') return Math.max(0, s - 1)
        return s + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [clock.timerRunning, clock.mode])

  if (!clock.enabled) return null
  let text = ''
  if (clock.mode === 'clock') text = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  else {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return (
    <div className="absolute top-4 right-4 z-30 bg-black/70 text-white px-3 py-1.5 rounded backdrop-blur text-sm font-mono border border-white/20">
      {text}
    </div>
  )
}

export function ProgramView({
  program,
  streams,
  isBlack,
  fade,
  showOverlays = true,
}: {
  program: Source | null | undefined
  streams: Map<string, MediaStream>
  isBlack: boolean
  fade: number
  showOverlays?: boolean
}) {
  const [display, setDisplay] = useState(program)
  const [opacity, setOpacity] = useState(1)
  const mixer = useAppStore((s) => s.mixer)
  const pips = useAppStore((s) => s.pips)
  const telop = useAppStore((s) => s.telop)
  const lowerThird = useAppStore((s) => s.lowerThird)
  const clock = useAppStore((s) => s.clock)
  const sources = useAppStore((s) => s.sources)
  const playlistAutoAdvance = useAppStore((s) => s.playlistAutoAdvance)
  const programId = useAppStore((s) => s.programId)
  const setProgram = useAppStore((s) => s.setProgram)

  const masterVol = mixer.muted ? 0 : mixer.masterVolume

  useEffect(() => {
    if (fade > 0) {
      setOpacity(0)
      const t = setTimeout(() => {
        setDisplay(program)
        setOpacity(1)
      }, fade)
      return () => clearTimeout(t)
    } else {
      setDisplay(program)
    }
  }, [program?.id, fade, program])

  const handleVideoEnded = () => {
    if (!playlistAutoAdvance) return
    const idx = sources.findIndex((s) => s.id === programId)
    if (idx >= 0 && idx < sources.length - 1) {
      const next = sources[idx + 1]
      // only auto advance if next is video
      if (next.type === 'video') {
        setProgram(next.id)
      }
    }
  }

  if (isBlack) {
    return <div className="w-full h-full bg-black" />
  }
  if (!display) {
    return <div className="w-full h-full bg-black flex items-center justify-center text-white/40">NO SIGNAL</div>
  }

  let content
  const videoVol = masterVol * mixer.videoVolume * ((display as any).volume ?? 1)
  const bgmSources = sources.filter((s) => s.type === 'bgm') as any[]

  if (display.type === 'video') content = <VideoOutput src={display} volume={videoVol} onEnded={handleVideoEnded} />
  else if (display.type === 'image') content = <ImageOutput src={display} />
  else if (display.type === 'slide') content = <SlideOutput src={display} />
  else if (display.type === 'camera') content = <CameraOutput src={display} streams={streams} />
  else if (display.type === 'screen') content = <ScreenOutput src={display} />
  else if (display.type === 'standby') content = <StandbyOutput src={display} />
  else if (display.type === 'black') content = <div className="w-full h-full bg-black" />
  else if (display.type === 'bgm') content = <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/60">♪ BGM: {display.name}</div>
  else content = <div className="w-full h-full bg-black" />

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <div style={{ opacity, transition: `opacity ${fade}ms ease` }} className="w-full h-full relative">
        {content}
        {/* BGM audio elements (always playing if bgm source exists, independent of program) */}
        {bgmSources.map((bgm) => (
          <AudioOutput key={bgm.id} src={bgm} volume={masterVol * mixer.bgmVolume * (bgm.volume ?? 0.7)} />
        ))}
        {/* PIPs behind telop */}
        {showOverlays &&
          pips
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((pip) => {
              const src = sources.find((s) => s.id === pip.sourceId)
              return <PipRenderer key={pip.id} pip={pip} source={src} streams={streams} volume={videoVol} />
            })}
        {/* Telop full-screen transparent PNG */}
        {showOverlays && telop.enabled && telop.imageUrl && (
          <img
            src={telop.imageUrl}
            alt="telop"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: telop.opacity, transform: `scale(${telop.scale})`, transformOrigin: 'center' }}
          />
        )}
        {/* Lower third */}
        {showOverlays && <LowerThirdView lt={lowerThird} />}
        {/* Clock/Timer */}
        {showOverlays && <ClockView clock={clock} />}
      </div>
    </div>
  )
}
