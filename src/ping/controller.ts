import { ping } from './pinger'
import { config } from '../config'
import { logger } from '../logger'
import { messageOf } from '../utils/message'
import { TimeTracker } from '../services/time'
import type { App } from '../app'
import type { PingResult } from './pinger'

interface PingTaskResult {
  resp?: PingResult
  err?: Error
  version: { protocolId: number; protocolIndex: number }
}

export class PingController {
  private readonly _app: App
  private _isRunningTasks = false
  private _intervalId?: ReturnType<typeof setInterval>

  constructor(app: App) {
    this._app = app
  }

  schedule(): void {
    this._intervalId = setInterval(() => this.pingAll(), config.rates.pingAll)
    // Run immediately
    this.pingAll()
  }

  stop(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = undefined
    }
  }

  private pingAll(): void {
    const { timestamp, updateHistoryGraph } = this._app.timeTracker.newPointTimestamp()

    this.startPingTasks(results => {
      const updates: (ReturnType<typeof this._app.serverRegistrations[0]['handlePing']> | null)[] = []

      for (const serverReg of this._app.serverRegistrations) {
        const result = results[serverReg.serverId]
        if (!result) continue

        // Log to InfluxDB if enabled in write mode
        if (config.influxdb.enabled && config.influxdb.mode === 'write' && this._app.database) {
          const playerCount = result.resp?.players.online ?? null
          this._app.database.insertPing(
            serverReg.data.ip,
            serverReg.data.name,
            serverReg.data.type,
            timestamp,
            playerCount
          )
        }

        const update = serverReg.handlePing(timestamp, result.resp, result.err, result.version, updateHistoryGraph)
        updates[serverReg.serverId] = update
      }

      // Flush InfluxDB writes periodically
      if (config.influxdb.enabled && config.influxdb.mode === 'write' && this._app.database) {
        this._app.database.flush().catch(err => {
          logger.error(`InfluxDB flush error: ${err?.message}`)
        })
      }

      this._app.server.broadcast(messageOf('updateServers', {
        timestamp: TimeTracker.toSeconds(timestamp),
        updateHistoryGraph,
        updates
      }))
    })
  }

  private startPingTasks(callback: (results: PingTaskResult[]) => void): void {
    if (this._isRunningTasks) {
      logger.warn('Re-pinging before last loop finished! Consider increasing PING_INTERVAL in .env')
      return
    }

    this._isRunningTasks = true
    const results: PingTaskResult[] = []
    const total = this._app.serverRegistrations.length

    if (total === 0) {
      this._isRunningTasks = false
      callback(results)
      return
    }

    for (const serverReg of this._app.serverRegistrations) {
      const version = serverReg.getNextProtocolVersion()

      ping(serverReg, config.rates.connectTimeout, (err, resp) => {
        if (err && config.logFailedPings) {
          logger.error(`Failed to ping ${serverReg.data.ip}: ${err.message}`)
        }

        results[serverReg.serverId] = { resp, err: err ?? undefined, version }

        const completedCount = results.filter(r => r !== undefined && r !== null).length
        if (completedCount === total) {
          this._isRunningTasks = false
          callback(results)
        }
      }, version.protocolId)
    }
  }
}
