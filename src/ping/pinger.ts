// These are CommonJS modules, use require for compatibility
const mcpingjs = require('mcping-js')
const mcpepingFixed = require('mcpe-ping-fixed')
const MinecraftServer = mcpingjs.MinecraftServer
const minecraftBedrockPing = mcpepingFixed
import { logger } from '../logger'
import type { ServerRegistration } from '../services/servers'

const MAX_PLAYER_COUNT = 250_000

function capPlayerCount(host: string, playerCount: number): number {
  if (playerCount > MAX_PLAYER_COUNT) {
    logger.warn(`${host} returned player count ${playerCount}, capped to ${MAX_PLAYER_COUNT}`)
    return MAX_PLAYER_COUNT
  }
  if (playerCount < 0) {
    logger.warn(`${host} returned invalid player count ${playerCount}, setting to 0`)
    return 0
  }
  return playerCount
}

export interface PingResult {
  players: { online: number }
  version?: number
  favicon?: string
}

export function ping(
  serverRegistration: ServerRegistration,
  timeout: number,
  callback: (err: Error | null, result?: PingResult) => void,
  protocolId?: number
): void {
  const { type, ip, port } = serverRegistration.data

  switch (type) {
    case 'PC': {
      serverRegistration.dnsResolver.resolve((host, resolvedPort, remainingTimeout) => {
        const server = new MinecraftServer(host, resolvedPort || 25565)
        server.ping(remainingTimeout, protocolId, (err: Error | null, res: any) => {
          if (err) {
            callback(err)
          } else {
            const result: PingResult = {
              players: {
                online: capPlayerCount(ip, parseInt(res.players?.online ?? 0, 10))
              },
              version: parseInt(res.version?.protocol ?? 0, 10)
            }
            if (res.favicon?.startsWith('data:image/')) {
              result.favicon = res.favicon
            }
            callback(null, result)
          }
        })
      })
      break
    }

    case 'PE': {
      minecraftBedrockPing(ip, port || 19132, (err: Error | null, res: any) => {
        if (err) {
          callback(err)
        } else {
          callback(null, {
            players: {
              online: capPlayerCount(ip, parseInt(res.currentPlayers ?? 0, 10))
            }
          })
        }
      }, timeout)
      break
    }

    default:
      callback(new Error(`Unsupported server type: ${type}`))
  }
}
