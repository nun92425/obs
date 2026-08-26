import { useEffect, useRef, useState } from 'react'
import type { Source } from '../../types/scene'

function VideoOutput({ src, volume }: { src: any; volume: number }) {
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
  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      {src.url ? (
        <video src={src.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
      ) : (
        <div className="absolute inset-0" style={{ background: src.bgColor || '#0f172a' }} />
      )}
      <div className="relative z-10 text-center p-8">
        <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-4">{src.text}</h1>
        {src.subText && <p className="text-xl text-white/80">{src.subText}</p>}
      </div>
    </div>
  )
}

function CameraOutput({ src, streams }: { src: any; streams: Map<string, MediaStream> }) {
  const stream = streams.get(src.peerId) || (src as any)._localStream
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

export function ProgramView({
  program,
  streams,
  isBlack,
  fade,
}: {
  program: Source | null | undefined
  streams: Map<string, MediaStream>
  isBlack: boolean
  fade: number
}) {
  const [display, setDisplay] = useState(program)
  const [opacity, setOpacity] = useState(1)

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

  if (isBlack) {
    return <div className="w-full h-full bg-black" />
  }
  if (!display) {
    return <div className="w-full h-full bg-black flex items-center justify-center text-white/40">NO SIGNAL</div>
  }

  let content
  if (display.type === 'video') content = <VideoOutput src={display} volume={1} />
  else if (display.type === 'image') content = <ImageOutput src={display} />
  else if (display.type === 'slide') content = <SlideOutput src={display} />
  else if (display.type === 'camera') content = <CameraOutput src={display} streams={streams} />
  else if (display.type === 'screen') content = <ScreenOutput src={display} />
  else if (display.type === 'standby') content = <StandbyOutput src={display} />
  else if (display.type === 'black') content = <div className="w-full h-full bg-black" />
  else content = <div className="w-full h-full bg-black" />

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <div style={{ opacity, transition: `opacity ${fade}ms ease` }} className="w-full h-full">
        {content}
      </div>
    </div>
  )
}
