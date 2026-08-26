import { create } from 'zustand'
import type { Source, MixerState, PipOverlay, TelopState, LowerThirdState, ClockState } from '../types/scene'
import localforage from 'localforage'

type AppStore = {
  sources: Source[]
  previewId: string | null
  programId: string | null
  isBlack: boolean
  fadeDuration: number // ms
  transition: 'cut' | 'fade'
  mixer: MixerState
  roomCode: string | null
  pips: PipOverlay[]
  telop: TelopState
  lowerThird: LowerThirdState
  clock: ClockState
  playlistAutoAdvance: boolean
  _hydrated: boolean

  // actions
  setSources: (s: Source[]) => void
  addSource: (s: Source) => void
  updateSource: (id: string, patch: Partial<Source>) => void
  removeSource: (id: string) => void
  setPreview: (id: string | null) => void
  setProgram: (id: string | null) => void
  take: () => void
  cut: () => void
  setBlack: (v: boolean) => void
  setTransition: (t: 'cut' | 'fade') => void
  setFadeDuration: (d: number) => void
  setMixer: (m: Partial<MixerState>) => void
  setRoomCode: (c: string | null) => void
  setPips: (p: PipOverlay[]) => void
  addPip: (p: PipOverlay) => void
  updatePip: (id: string, patch: Partial<PipOverlay>) => void
  removePip: (id: string) => void
  setTelop: (t: Partial<TelopState>) => void
  setLowerThird: (l: Partial<LowerThirdState>) => void
  setClock: (c: Partial<ClockState>) => void
  setPlaylistAutoAdvance: (v: boolean) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  exportJson: () => string
  importJson: (json: string) => void
}

const STORAGE_KEY = 'obs-app-state-v2'
const BLOB_STORE = localforage.createInstance({ name: 'obs-blobs' })
export const BLOB_STORE_EXPORT = BLOB_STORE

export const useAppStore = create<AppStore>((set, get) => ({
  sources: [
    {
      id: 'standby-1',
      type: 'standby',
      name: '待機画面',
      text: 'まもなく開演します',
      subText: 'しばらくお待ちください',
      bgColor: '#0f172a',
      overlayOpacity: 0.35,
      enableOverlay: true,
    } as Source,
    {
      id: 'black-1',
      type: 'black',
      name: 'BLACK',
    } as Source,
  ],
  previewId: 'standby-1',
  programId: 'standby-1',
  isBlack: false,
  fadeDuration: 300,
  transition: 'fade',
  mixer: {
    masterVolume: 1,
    bgmVolume: 0.7,
    micVolume: 1,
    videoVolume: 1,
    muted: false,
  },
  roomCode: null,
  pips: [],
  telop: {
    enabled: false,
    opacity: 1,
    scale: 1,
  },
  lowerThird: {
    enabled: false,
    text: '次の演目',
    subText: '3年1組 合唱',
    position: 'bottom',
    bgOpacity: 0.85,
    accentColor: '#e11d48',
  },
  clock: {
    enabled: false,
    mode: 'clock',
    countdownSec: 300,
    timerRunning: false,
    timerSec: 0,
  },
  playlistAutoAdvance: false,
  _hydrated: false,

  setSources: (sources) => {
    set({ sources })
    get().persist()
  },
  addSource: (s) => {
    set((state) => ({ sources: [...state.sources, s] }))
    get().persist()
  },
  updateSource: (id, patch) => {
    set((state) => ({
      sources: state.sources.map((src) => (src.id === id ? ({ ...src, ...patch } as Source) : src)),
    }))
    get().persist()
  },
  removeSource: (id) => {
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
      previewId: state.previewId === id ? null : state.previewId,
      programId: state.programId === id ? null : state.programId,
    }))
    get().persist()
  },
  setPreview: (id) => set({ previewId: id }),
  setProgram: (id) => set({ programId: id, isBlack: false }),
  take: () => {
    const { previewId } = get()
    if (previewId) {
      const src = get().sources.find((s) => s.id === previewId)
      if (src?.type === 'black') {
        set({ isBlack: true })
      } else {
        set({ programId: previewId, isBlack: false })
      }
      get().persist()
    }
  },
  cut: () => {
    const { previewId } = get()
    if (previewId) {
      const src = get().sources.find((s) => s.id === previewId)
      if (src?.type === 'black') set({ isBlack: true })
      else set({ programId: previewId, isBlack: false })
      get().persist()
    }
  },
  setBlack: (v) => set({ isBlack: v }),
  setTransition: (t) => set({ transition: t }),
  setFadeDuration: (d) => set({ fadeDuration: d }),
  setMixer: (m) => set((s) => ({ mixer: { ...s.mixer, ...m } })),
  setRoomCode: (c) => set({ roomCode: c }),
  setPips: (p) => {
    set({ pips: p })
    get().persist()
  },
  addPip: (p) => {
    set((s) => ({ pips: [...s.pips, p] }))
    get().persist()
  },
  updatePip: (id, patch) => {
    set((s) => ({ pips: s.pips.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    get().persist()
  },
  removePip: (id) => {
    set((s) => ({ pips: s.pips.filter((p) => p.id !== id) }))
    get().persist()
  },
  setTelop: (t) => {
    set((s) => ({ telop: { ...s.telop, ...t } }))
    get().persist()
  },
  setLowerThird: (l) => {
    set((s) => ({ lowerThird: { ...s.lowerThird, ...l } }))
    get().persist()
  },
  setClock: (c) => {
    set((s) => ({ clock: { ...s.clock, ...c } }))
    get().persist()
  },
  setPlaylistAutoAdvance: (v) => {
    set({ playlistAutoAdvance: v })
    get().persist()
  },

  hydrate: async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const sources: Source[] = parsed.sources || []
        for (const src of sources) {
          if ((src.type === 'video' || src.type === 'image' || src.type === 'standby' || src.type === 'bgm') && (src as any).blobId) {
            const blob: Blob | null = await BLOB_STORE.getItem((src as any).blobId)
            if (blob) {
              ;(src as any).url = URL.createObjectURL(blob)
            }
          }
          if (src.type === 'slide') {
            for (const slide of (src as any).slides) {
              for (const el of slide.elements) {
                if (el.type === 'image' && (el as any).blobId) {
                  const blob: Blob | null = await BLOB_STORE.getItem((el as any).blobId)
                  if (blob) el.url = URL.createObjectURL(blob)
                }
              }
            }
          }
        }
        // telop image
        let telop = parsed.telop || get().telop
        if (telop?.blobId) {
          const blob: Blob | null = await BLOB_STORE.getItem(telop.blobId)
          if (blob) telop.imageUrl = URL.createObjectURL(blob)
        }
        set({
          sources: sources.length ? sources : get().sources,
          previewId: parsed.previewId ?? get().previewId,
          programId: parsed.programId ?? get().programId,
          fadeDuration: parsed.fadeDuration ?? get().fadeDuration,
          transition: parsed.transition ?? get().transition,
          mixer: parsed.mixer ?? get().mixer,
          roomCode: parsed.roomCode ?? null,
          pips: parsed.pips ?? [],
          telop: telop,
          lowerThird: parsed.lowerThird ?? get().lowerThird,
          clock: parsed.clock ?? get().clock,
          playlistAutoAdvance: parsed.playlistAutoAdvance ?? false,
        })
      }
    } catch (e) {
      console.error('hydrate failed', e)
    } finally {
      set({ _hydrated: true })
    }
  },
  persist: async () => {
    const { sources, previewId, programId, fadeDuration, transition, mixer, roomCode, pips, telop, lowerThird, clock, playlistAutoAdvance } = get()
    for (const src of sources) {
      if ((src.type === 'video' || src.type === 'image' || src.type === 'standby' || src.type === 'bgm') && (src as any).url?.startsWith('blob:')) {
        if (!(src as any).blobId) {
          try {
            const res = await fetch((src as any).url)
            const blob = await res.blob()
            const blobId = `blob-${src.id}-${Date.now()}`
            await BLOB_STORE.setItem(blobId, blob)
            ;(src as any).blobId = blobId
          } catch {}
        }
      }
    }
    // telop blob
    if (telop.imageUrl?.startsWith('blob:') && !telop.blobId) {
      try {
        const res = await fetch(telop.imageUrl)
        const blob = await res.blob()
        const blobId = `blob-telop-${Date.now()}`
        await BLOB_STORE.setItem(blobId, blob)
        telop.blobId = blobId
      } catch {}
    }
    const toSave = {
      sources: sources.map((s) => {
        const copy: any = { ...s }
        if (copy.url?.startsWith('blob:')) copy.url = ''
        if (copy.type === 'slide') {
          copy.slides = copy.slides.map((sl: any) => ({
            ...sl,
            elements: sl.elements.map((el: any) => {
              const c: any = { ...el }
              if (c.url?.startsWith('blob:')) c.url = ''
              return c
            }),
          }))
        }
        return copy
      }),
      previewId,
      programId,
      fadeDuration,
      transition,
      mixer,
      roomCode,
      pips,
      telop: { ...telop, imageUrl: telop.imageUrl?.startsWith('blob:') ? '' : telop.imageUrl },
      lowerThird,
      clock,
      playlistAutoAdvance,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  },
  exportJson: () => {
    const { sources, previewId, programId, fadeDuration, transition, mixer, roomCode, pips, telop, lowerThird, clock, playlistAutoAdvance } = get()
    return JSON.stringify({ sources, previewId, programId, fadeDuration, transition, mixer, roomCode, pips, telop, lowerThird, clock, playlistAutoAdvance, version: 3 }, null, 2)
  },
  importJson: (json) => {
    try {
      const parsed = JSON.parse(json)
      if (parsed.sources) {
        set({
          sources: parsed.sources,
          previewId: parsed.previewId,
          programId: parsed.programId,
          fadeDuration: parsed.fadeDuration ?? 300,
          transition: parsed.transition ?? 'fade',
          mixer: parsed.mixer,
          roomCode: parsed.roomCode ?? null,
          pips: parsed.pips ?? [],
          telop: parsed.telop ?? get().telop,
          lowerThird: parsed.lowerThird ?? get().lowerThird,
          clock: parsed.clock ?? get().clock,
          playlistAutoAdvance: parsed.playlistAutoAdvance ?? false,
        })
        get().persist()
      }
    } catch (e) {
      alert('JSON読込失敗: ' + e)
    }
  },
}))

// helper to store blob
export async function storeBlobForSource(sourceId: string, file: File): Promise<{ blobId: string; url: string }> {
  const blobId = `blob-${sourceId}-${Date.now()}`
  await BLOB_STORE.setItem(blobId, file)
  const url = URL.createObjectURL(file)
  return { blobId, url }
}
