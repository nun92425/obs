import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'

const PORT = parseInt(process.env.PORT || '3001', 10)

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('OBS signaling server')
})

const wss = new WebSocketServer({ server: httpServer })

// roomCode -> Set<WebSocket>
const rooms = new Map<string, Set<WebSocket>>()

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const room = url.searchParams.get('room') || 'default'
  console.log(`client connected room=${room}`)

  if (!rooms.has(room)) rooms.set(room, new Set())
  rooms.get(room)!.add(ws)

  ws.on('message', (data) => {
    // broadcast to others in same room
    const roomSet = rooms.get(room)
    if (!roomSet) return
    for (const client of roomSet) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data.toString())
      }
    }
  })

  ws.on('close', () => {
    rooms.get(room)?.delete(ws)
    if (rooms.get(room)?.size === 0) rooms.delete(room)
    console.log(`client disconnected room=${room} remaining=${rooms.get(room)?.size || 0}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`signaling server listening on :${PORT}`)
})
