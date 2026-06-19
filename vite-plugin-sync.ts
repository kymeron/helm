/**
 * Vite plugin: HELM LAN Sync Server
 *
 * Adds a WebSocket endpoint at `/__helm-sync` that broadcasts task state
 * between every browser tab/device connected to the same dev server.
 *
 * Architecture:
 *   - Each client maintains its own IndexedDB (authoritative on its side).
 *   - On every local mutation, the client sends its full task list over WS.
 *   - The server keeps the latest received snapshot in memory and forwards
 *     every message to every *other* connected client (no echo).
 *   - A new client joining receives the latest snapshot immediately so it
 *     converges without waiting for the next mutation.
 *
 * Limitations:
 *   - State lives in process memory. Restart of `npm run dev` drops it.
 *   - No auth — anyone on the LAN can join. Fine for home use, not for
 *     public WiFi.
 */

import { WebSocketServer, WebSocket } from 'ws'
import type { Plugin, ViteDevServer } from 'vite'

const SYNC_PATH = '/__helm-sync'

interface SyncClient {
  id: string
  socket: WebSocket
  userAgent: string
  connectedAt: number
}

function makeId(): string {
  // Cheap unique-enough id; avoid `crypto.randomUUID` so we don't pull it
  // into the server bundle (it's available in Node 19+ anyway, but keep
  // the plugin Node-version-tolerant).
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function helmSync(): Plugin {
  let wss: WebSocketServer | null = null
  const clients = new Map<WebSocket, SyncClient>()
  let latestSnapshot: unknown = null

  return {
    name: 'helm:sync',
    apply: 'serve', // dev server only

    configureServer(server: ViteDevServer) {
      wss = new WebSocketServer({ noServer: true })

      server.httpServer?.on('upgrade', (req, socket, head) => {
        const url = req.url ?? ''
        if (!url.startsWith(SYNC_PATH)) {
          // Not for us — let other plugins (Vite HMR) handle it.
          return
        }
        wss!.handleUpgrade(req, socket, head, (ws) => {
          const client: SyncClient = {
            id: makeId(),
            socket: ws,
            userAgent: (req.headers['user-agent'] ?? 'unknown').slice(0, 100),
            connectedAt: Date.now(),
          }
          clients.set(ws, client)
          console.log(
            `[helm:sync] + ${client.id.slice(0, 6)} (${clients.size} total)`,
          )

          // Send latest snapshot to the new client so it converges immediately.
          if (latestSnapshot !== null) {
            safeSend(ws, { type: 'snapshot', tasks: latestSnapshot })
          }

          ws.on('message', (raw) => {
            let msg: { type?: string; tasks?: unknown }
            try {
              msg = JSON.parse(raw.toString())
            } catch {
              return
            }
            if (msg.type !== 'state' || !Array.isArray(msg.tasks)) return

            // Cache authoritative state so future joiners can catch up.
            latestSnapshot = msg.tasks

            // Broadcast to every other client.
            let fanout = 0
            for (const [other] of clients) {
              if (other === ws) continue
              if (other.readyState !== WebSocket.OPEN) continue
              if (safeSend(other, { type: 'snapshot', tasks: msg.tasks })) {
                fanout++
              }
            }
            console.log(
              `[helm:sync] ${client.id.slice(0, 6)} → ${fanout} peer(s), ${
                (msg.tasks as unknown[]).length
              } task(s)`,
            )
          })

          ws.on('close', () => {
            clients.delete(ws)
            console.log(
              `[helm:sync] - ${client.id.slice(0, 6)} (${clients.size} remaining)`,
            )
          })

          ws.on('error', () => {
            // Errors usually precede close; nothing to do here.
          })
        })
      })

      // Best-effort log so the dev banner can show the WS URL.
      server.config.logger.info(
        `\n  ➜  HELM sync: ws://<host>${SYNC_PATH}`,
      )

      server.httpServer?.on('close', () => {
        for (const [, c] of clients) c.socket.close()
        clients.clear()
        wss?.close()
      })
    },
  }
}

function safeSend(ws: WebSocket, payload: unknown): boolean {
  try {
    ws.send(JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}