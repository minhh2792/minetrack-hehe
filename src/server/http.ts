import { Elysia } from 'elysia'
import path from 'path'
import { logger } from '../logger'
import { messageOf } from '../utils/message'
import type { App } from '../app'

const BROADCAST_TOPIC = 'minetrack'
const FRONTEND_DIST = path.resolve('frontend/dist')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.json': 'application/json',
  '.map':  'application/json'
}

function getMime(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

async function serveStaticFile(filepath: string): Promise<Response | null> {
  try {
    const file = Bun.file(filepath)
    const exists = await file.exists()
    if (!exists) return null
    return new Response(file, {
      headers: { 'Content-Type': getMime(filepath) }
    })
  } catch {
    return null
  }
}

export class WebServer {
  private readonly _app: App
  private _elysia!: Elysia
  private _connectedClients = 0

  constructor(app: App) {
    this._app = app
  }

  setup(): void {
    this._elysia = new Elysia()
      // Serve hashed favicons
      .get('/hashedfavicon_:hash.png', ({ params }: { params: { hash: string } }) => {
        const hash = params.hash
        for (const serverReg of this._app.serverRegistrations) {
          if (serverReg.faviconHash === hash && serverReg.lastFavicon) {
            const imageData = serverReg.lastFavicon.split(',')[1]
            if (!imageData) continue
            const buf = Buffer.from(imageData, 'base64')
            return new Response(buf, {
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800'
              }
            })
          }
        }
        return new Response('Not found', { status: 404 })
      })
      // WebSocket
      .ws('/ws', {
        open: (ws: any) => {
          this._connectedClients++
          logger.info(`Client connected, total: ${this._connectedClients}`)
          ws.subscribe(BROADCAST_TOPIC)
          this._app.handleClientConnection(ws)
        },
        message: (ws: any, message: string) => {
          if (typeof message === 'string' && message === 'requestHistoryGraph') {
            this._sendHistoryGraph(ws)
          }
        },
        close: (ws: any) => {
          this._connectedClients = Math.max(0, this._connectedClients - 1)
          logger.info(`Client disconnected, total: ${this._connectedClients}`)
        }
      })
      // Static file serving + SPA fallback
      .get('/*', async ({ request }) => {
        const url = new URL(request.url)
        let pathname = decodeURIComponent(url.pathname)

        // Strip leading slash
        if (pathname.startsWith('/')) pathname = pathname.slice(1)
        if (!pathname) pathname = 'index.html'

        // Try to serve the file directly
        const filePath = path.join(FRONTEND_DIST, pathname)
        const response = await serveStaticFile(filePath)
        if (response) return response

        // SPA fallback - serve index.html
        const indexFile = Bun.file(path.join(FRONTEND_DIST, 'index.html'))
        return new Response(indexFile, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      })
  }

  private _sendHistoryGraph(ws: any): void {
    if (!this._app.database) return

    const graphData = this._app.serverRegistrations.map(s => s.graphData)
    ws.send(messageOf('historyGraph', {
      timestamps: this._app.timeTracker.getGraphPoints(),
      graphData
    }))
  }

  listen(host: string, port: number): void {
    this._elysia.listen({ hostname: host, port }, () => {
      logger.info(`Server started on ${host}:${port}`)
    })
  }

  broadcast(payload: string): void {
    if (this._elysia.server) {
      this._elysia.server.publish(BROADCAST_TOPIC, payload)
    }
  }
}
