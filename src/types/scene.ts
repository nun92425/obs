export type SourceType = 'video' | 'image' | 'slide' | 'camera' | 'screen' | 'standby' | 'black' | 'bgm'

export type BaseSource = {
  id: string
  type: SourceType
  name: string
}

export type VideoSource = BaseSource & {
  type: 'video'
  url: string // blob url or object URL
  fileName: string
  loop: boolean
  volume: number // 0-1
  blobId?: string
}
export type ImageSource = BaseSource & {
  type: 'image'
  url: string
  fileName: string
  blobId?: string
}
export type SlideElementType = 'text' | 'image' | 'shape'
export type AnimPreset = 'none' | 'fadeIn' | 'slideInLeft' | 'slideInRight' | 'zoomIn' | 'pop'
export type TransitionType = 'cut' | 'fade' | 'slide'

export type SlideElement = {
  id: string
  type: SlideElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  text?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  bg?: string
  url?: string // for image element
  shapeType?: 'rect' | 'circle'
  anim: AnimPreset
  animDuration: number // ms
  animDelay: number // ms
}

export type Slide = {
  id: string
  bg: string
  elements: SlideElement[]
  transition: TransitionType
}

export type SlideDeckSource = BaseSource & {
  type: 'slide'
  slides: Slide[]
  currentIndex: number
}

export type CameraSource = BaseSource & {
  type: 'camera'
  peerId?: string
  label?: string
}

export type ScreenSource = BaseSource & {
  type: 'screen'
  label?: string
}

export type StandbySource = BaseSource & {
  type: 'standby'
  url?: string // video url
  text: string
  subText?: string
  bgColor?: string
  overlayOpacity?: number // 0-1, default 0.35
  enableOverlay?: boolean // default true (auto hides when text empty)
  blobId?: string
}

export type BlackSource = BaseSource & {
  type: 'black'
}

export type BgmSource = BaseSource & {
  type: 'bgm'
  url: string
  fileName: string
  loop: boolean
  volume: number
  blobId?: string
}

export type PipShape = 'rect' | 'circle' | 'rounded'

export type PipOverlay = {
  id: string
  sourceId: string // refers to Source.id
  enabled: boolean
  x: number // 0-100 %
  y: number
  width: number
  height: number
  rotation: number // deg
  opacity: number // 0-1
  shape: PipShape
  borderRadius: number // 0-50 %
  zIndex: number
}

export type TelopState = {
  enabled: boolean
  imageUrl?: string
  blobId?: string
  opacity: number // 0-1
  scale: number // 0.5-1.5
}

export type LowerThirdState = {
  enabled: boolean
  text: string
  subText: string
  position: 'bottom' | 'top'
  bgOpacity: number
  accentColor: string
}

export type ClockState = {
  enabled: boolean
  mode: 'clock' | 'timer' | 'countdown'
  countdownSec: number // for countdown
  timerRunning: boolean
  timerSec: number
}

export type Source =
  | VideoSource
  | ImageSource
  | SlideDeckSource
  | CameraSource
  | ScreenSource
  | StandbySource
  | BlackSource
  | BgmSource

export type MixerState = {
  masterVolume: number
  bgmVolume: number
  micVolume: number
  videoVolume: number
  muted: boolean
}

export type AppState = {
  sources: Source[]
  previewId: string | null // legacy, kept for migration
  previewIds: (string | null)[]
  activePreviewIndex: number // 0-2
  programId: string | null
  isBlack: boolean
  fadeDuration: number
  mixer: MixerState
  roomCode: string | null
  pips: PipOverlay[]
  telop: TelopState
  lowerThird: LowerThirdState
  clock: ClockState
  playlistAutoAdvance: boolean
}
