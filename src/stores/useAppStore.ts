import { create } from 'zustand'
import type { Source, MixerState } from '../types/scene'
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
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  exportJson: () => string
  importJson: (json: string) => void
}

const STORAGE_KEY = 'obs-app-state-v2'
const BLOB_STORE = localforage.createInstance({ name: 'obs-blobs' })

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
      // broadcast will be handled by sync hook
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

  hydrate: async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Rehydrate blob URLs
        const sources: Source[] = parsed.sources || []
        for (const src of sources) {
          if ((src.type === 'video' || src.type === 'image' || src.type === 'standby') && (src as any).blobId) {
            const blob: Blob | null = await BLOB_STORE.getItem((src as any).blobId)
            if (blob) {
              ;(src as any).url = URL.createObjectURL(blob)
            }
          }
          // slide image elements
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
        set({
          sources: sources.length ? sources : get().sources,
          previewId: parsed.previewId ?? get().previewId,
          programId: parsed.programId ?? get().programId,
          fadeDuration: parsed.fadeDuration ?? get().fadeDuration,
          transition: parsed.transition ?? get().transition,
          mixer: parsed.mixer ?? get().mixer,
          roomCode: parsed.roomCode ?? null,
        })
      }
    } catch (e) {
      console.error('hydrate failed', e)
    } finally {
      set({ _hydrated: true })
    }
  },
  persist: async () => {
    const { sources, previewId, programId, fadeDuration, transition, mixer, roomCode } = get()
    // persist blobs separately
    for (const src of sources) {
      if ((src.type === 'video' || src.type === 'image' || src.type === 'standby') && (src as any).url?.startsWith('blob:')) {
        // if blobId not set, fetch blob and store
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
    const toSave = {
      sources: sources.map((s) => {
        // strip blob url to avoid huge string, keep blobId
        const copy: any = { ...s }
        if (copy.url?.startsWith('blob:')) copy.url = '' // will be rehydrated
        if (copy.type === 'slide') {
          copy.slides = copy.slides.map((sl: any) => ({
            ...sl,
            elements: sl.elements.map((el: any) => {
              const c: any = { ...el }
              if (c.url?.startsWith('blob:')) {
                // store blob if needed
                c.url = ''
              }
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
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  },
  exportJson: () => {
    const { sources, previewId, programId, fadeDuration, transition, mixer, roomCode } = get()
    return JSON.stringify({ sources, previewId, programId, fadeDuration, transition, mixer, roomCode, version: 2 }, null, 2)
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
