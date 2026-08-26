export type SourceType = 'video' | 'image' | 'slide' | 'camera' | 'screen' | 'standby' | 'black'

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
}

export type BlackSource = BaseSource & {
  type: 'black'
}

export type Source =
  | VideoSource
  | ImageSource
  | SlideDeckSource
  | CameraSource
  | ScreenSource
  | StandbySource
  | BlackSource

export type MixerState = {
  masterVolume: number
  bgmVolume: number
  micVolume: number
  videoVolume: number
  muted: boolean
}

export type AppState = {
  sources: Source[]
  previewId: string | null
  programId: string | null
  isBlack: boolean
  fadeDuration: number
  mixer: MixerState
  roomCode: string | null
}
