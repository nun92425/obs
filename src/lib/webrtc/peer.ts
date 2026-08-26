import Peer, { type MediaConnection } from 'peerjs'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  // Public TURN (openrelay) — for MVP, fallback. User can override via env.
  // These are free but rate-limited.
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

// allow override via VITE_TURN_URL etc.
function getIceServers(): RTCIceServer[] {
  const env = (import.meta as any).env
  if (env?.VITE_TURN_URL) {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: env.VITE_TURN_URL,
        username: env.VITE_TURN_USERNAME || '',
        credential: env.VITE_TURN_CREDENTIAL || '',
      },
    ]
  }
  return ICE_SERVERS
}

export function createPeer(peerId?: string): Peer {
  const peer = new Peer(peerId || '', {
    config: { iceServers: getIceServers() },
  })
  return peer
}

export type CameraStream = {
  peerId: string
  stream: MediaStream
  conn?: MediaConnection
}

export function getDisplayStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
}

export function getCameraStream(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: true,
  })
}
