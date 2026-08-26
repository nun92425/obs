import { create } from 'zustand'
import type { Source, MixerState, PipOverlay, TelopState, LowerThirdState, ClockState } from '../types/scene'
import localforage from 'localforage'

type AppStore = {
  sources: Source[]
  previewId: string | null // legacy
  previewIds: (string | null)[]
  activePreviewIndex: number
  programId: string | null
  isBlack: boolean
  fadeDuration: number // ms
  transition: 'cut' | 'fade'
  mixer: MixerState
  roomCode: string | null
  peerId: string | null
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
  setPreview: (id: string | null, index?: number) => void
  setActivePreview: (index: number) => void
  clearPreview: (index: number) => void
  addToNext: (id: string) => void
  setProgram: (id: string | null) => void
  take: (index?: number) => void
  cut: (index?: number) => void
  takeActive: () => void
  setBlack: (v: boolean) => void
  setTransition: (t: 'cut' | 'fade') => void
  setFadeDuration: (d: number) => void
  setMixer: (m: Partial<MixerState>) => void
  setRoomCode: (c: string | null) => void
  setPeerId: (id: string) => void
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

function genPeerId() {
  // try localStorage first for migration
  try {
    const existing = localStorage.getItem('obs-peer-id')
    if (existing) return existing
  } catch {}
  const id = 'obs-' + Math.random().toString(36).slice(2, 8) + '-' + Date.now().toString(36).slice(-4)
  try {
    localStorage.setItem('obs-peer-id', id)
  } catch {}
  return id
}

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
  previewIds: ['standby-1', null, null],
  activePreviewIndex: 0,
  programId: 'standby-1',
  peerId: genPeerId(),
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
      previewIds: state.previewIds.map((v) => (v === id ? null : v)),
      programId: state.programId === id ? null : state.programId,
    }))
    get().persist()
  },
  setPreview: (id, index) => {
    const idx = index ?? get().activePreviewIndex
    set((state) => {
      const next = [...state.previewIds] as (string | null)[]
      // ensure length 3
      while (next.length < 3) next.push(null)
      next[idx] = id
      return { previewIds: next, previewId: id, activePreviewIndex: idx }
    })
    get().persist()
  },
  setActivePreview: (index) => set({ activePreviewIndex: Math.max(0, Math.min(2, index)) }),
  clearPreview: (index) => {
    set((state) => {
      const next = [...state.previewIds]
      next[index] = null
      const activeId = next[state.activePreviewIndex] ?? null
      return { previewIds: next, previewId: activeId }
    })
    get().persist()
  },
  addToNext: (id) => {
    const { previewIds, activePreviewIndex } = get()
    // find first empty, else overwrite active
    let target = previewIds.findIndex((v) => v === null)
    if (target === -1) target = activePreviewIndex
    get().setPreview(id, target)
  },
  setProgram: (id) => set({ programId: id, isBlack: false }),
  take: (index) => {
    const idx = index ?? get().activePreviewIndex
    const previewIds = get().previewIds
    const takeId = previewIds[idx]
    if (takeId) {
      const src = get().sources.find((s) => s.id === takeId)
      if (src?.type === 'black') set({ isBlack: true })
      else set({ programId: takeId, isBlack: false })
      // queue shift: remove taken and shift remaining forward if we want queue behavior
      // For now, clear the taken slot and shift left to keep queue compact
      set((state) => {
        const next = [...state.previewIds]
        // remove taken element and push null to end to maintain 3 slots (queue shift)
        next.splice(idx, 1)
        next.push(null)
        const activeId = next[state.activePreviewIndex] ?? next.find((v) => v !== null) ?? null
        // if active index now points to null, find next non-null
        let newActive = state.activePreviewIndex
        if (next[newActive] === null) {
          const firstNonNull = next.findIndex((v) => v !== null)
          newActive = firstNonNull >= 0 ? firstNonNull : 0
        }
        return { previewIds: next, previewId: activeId, activePreviewIndex: newActive }
      })
      get().persist()
    }
  },
  cut: (index) => {
    // cut is same as take but without fade handling (fade handled in view)
    get().take(index)
  },
  takeActive: () => get().take(),
  setBlack: (v) => set({ isBlack: v }),
  setTransition: (t) => set({ transition: t }),
  setFadeDuration: (d) => set({ fadeDuration: d }),
  setMixer: (m) => set((s) => ({ mixer: { ...s.mixer, ...m } })),
  setRoomCode: (c) => set({ roomCode: c }),
  setPeerId: (id) => {
    try {
      localStorage.setItem('obs-peer-id', id)
    } catch {}
    set({ peerId: id })
    get().persist()
  },
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
        // migrate previewId -> previewIds
        let previewIds: (string | null)[] = parsed.previewIds
        let activePreviewIndex: number = parsed.activePreviewIndex ?? 0
        if (!previewIds) {
          if (parsed.previewId) previewIds = [parsed.previewId, null, null]
          else if (parsed.previewIds === undefined) previewIds = [get().previewIds[0] ?? 'standby-1', null, null]
        }
        // ensure length 3
        while (previewIds.length < 3) previewIds.push(null)
        previewIds = previewIds.slice(0, 3)
        const previewId = previewIds[activePreviewIndex] ?? previewIds.find((v) => v !== null) ?? null
        // peerId: migrate from localStorage if not in parsed
        let peerId: string | null = parsed.peerId ?? null
        if (!peerId) {
          try {
            peerId = localStorage.getItem('obs-peer-id')
          } catch {}
          if (!peerId) peerId = get().peerId
        } else {
          try {
            localStorage.setItem('obs-peer-id', peerId)
          } catch {}
        }
        set({
          sources: sources.length ? sources : get().sources,
          previewId,
          previewIds,
          activePreviewIndex,
          programId: parsed.programId ?? get().programId,
          fadeDuration: parsed.fadeDuration ?? get().fadeDuration,
          transition: parsed.transition ?? get().transition,
          mixer: parsed.mixer ?? get().mixer,
          roomCode: parsed.roomCode ?? null,
          peerId,
          pips: parsed.pips ?? [],
          telop: telop,
          lowerThird: parsed.lowerThird ?? get().lowerThird,
          clock: parsed.clock ?? get().clock,
          playlistAutoAdvance: parsed.playlistAutoAdvance ?? false,
        })
      } else {
        // first time: ensure peerId is stored
        try {
          const pid = get().peerId
          if (pid) localStorage.setItem('obs-peer-id', pid)
        } catch {}
      }
    } catch (e) {
      console.error('hydrate failed', e)
    } finally {
      set({ _hydrated: true })
    }
  },
  persist: async () => {
    const { sources, previewId, previewIds, activePreviewIndex, programId, fadeDuration, transition, mixer, roomCode, peerId, pips, telop, lowerThird, clock, playlistAutoAdvance } = get()
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
      previewIds,
      activePreviewIndex,
      programId,
      fadeDuration,
      transition,
      mixer,
      roomCode,
      peerId,
      pips,
      telop: { ...telop, imageUrl: telop.imageUrl?.startsWith('blob:') ? '' : telop.imageUrl },
      lowerThird,
      clock,
      playlistAutoAdvance,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  },
  exportJson: () => {
    const { sources, previewId, previewIds, activePreviewIndex, programId, fadeDuration, transition, mixer, roomCode, peerId, pips, telop, lowerThird, clock, playlistAutoAdvance } = get()
    return JSON.stringify({ sources, previewId, previewIds, activePreviewIndex, programId, fadeDuration, transition, mixer, roomCode, peerId, pips, telop, lowerThird, clock, playlistAutoAdvance, version: 4 }, null, 2)
  },
  importJson: (json) => {
    try {
      const parsed = JSON.parse(json)
      if (parsed.sources) {
        let previewIds: (string | null)[] = parsed.previewIds
        let activePreviewIndex: number = parsed.activePreviewIndex ?? 0
        if (!previewIds && parsed.previewId) previewIds = [parsed.previewId, null, null]
        if (previewIds) {
          while (previewIds.length < 3) previewIds.push(null)
          previewIds = previewIds.slice(0, 3)
        } else {
          previewIds = get().previewIds
        }
        const previewId = previewIds[activePreviewIndex] ?? previewIds.find((v) => v !== null) ?? parsed.previewId ?? null
        const peerId = parsed.peerId ?? get().peerId
        if (peerId) {
          try {
            localStorage.setItem('obs-peer-id', peerId)
          } catch {}
        }
        set({
          sources: parsed.sources,
          previewId,
          previewIds,
          activePreviewIndex,
          programId: parsed.programId,
          fadeDuration: parsed.fadeDuration ?? 300,
          transition: parsed.transition ?? 'fade',
          mixer: parsed.mixer,
          roomCode: parsed.roomCode ?? null,
          peerId,
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
