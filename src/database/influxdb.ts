import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client'
import { config } from '../config'
import { logger } from '../logger'
import { TimeTracker } from '../services/time'
import type { App } from '../app'

// InfluxDB schema (matches Grafana dashboard):
//   measurement : playerCount
//   tags        : name (server display name), ip (server IP address)
//   fields      : playerCount (int), latency (int, ms)

export class InfluxDatabase {
  private readonly _app: App
  private _writeApi?: WriteApi
  private _queryApi?: QueryApi
  private _client?: InfluxDB

  constructor(app: App) {
    this._app = app
  }

  connect(): void {
    const { url, token, org, bucket, mode } = config.influxdb

    if (!url || !token || !org || !bucket) {
      logger.warn('InfluxDB configuration incomplete - database features disabled')
      return
    }

    this._client = new InfluxDB({ url, token })
    this._queryApi = this._client.getQueryApi(org)

    if (mode === 'write') {
      this._writeApi = this._client.getWriteApi(org, bucket, 'ms')
      logger.info(`InfluxDB connected in WRITE mode to ${url}`)
    } else {
      logger.info(`InfluxDB connected in READ mode to ${url}`)
    }
  }

  async loadGraphPoints(graphDuration: number): Promise<void> {
    if (!this._queryApi) return

    const endTime = Date.now()
    const startTime = endTime - graphDuration
    const startRfc = new Date(startTime).toISOString()
    const endRfc = new Date(endTime).toISOString()
    const { bucket } = config.influxdb

    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: ${startRfc}, stop: ${endRfc})
        |> filter(fn: (r) => r["_measurement"] == "playerCount")
        |> filter(fn: (r) => r["_field"] == "playerCount")
        |> sort(columns: ["_time"])
    `

    try {
      const relativeGraphData: Record<string, [number[], (number | null)[]]> = {}

      await new Promise<void>((resolve, reject) => {
        this._queryApi!.queryRows(fluxQuery, {
          next: (row, tableMeta) => {
            const obj = tableMeta.toObject(row)
            // 'name' tag identifies the server (display name)
            const name = obj.name as string
            const timestamp = new Date(obj._time as string).getTime()
            const playerCount = obj._value as number | null

            if (!relativeGraphData[name]) {
              relativeGraphData[name] = [[], []]
            }
            relativeGraphData[name][0].push(timestamp)
            relativeGraphData[name][1].push(playerCount)
          },
          error: reject,
          complete: resolve
        })
      })

      for (const name of Object.keys(relativeGraphData)) {
        const serverReg = this._app.serverRegistrations.find(s => s.data.name === name)
        if (serverReg) {
          const [timestamps, points] = relativeGraphData[name]
          serverReg.loadGraphPoints(startTime, timestamps, points)
        }
      }

      // Load timestamps from first server with data
      const firstName = Object.keys(relativeGraphData)[0]
      if (firstName) {
        this._app.timeTracker.loadGraphPoints(startTime, relativeGraphData[firstName][0])
      }

      logger.info(`Loaded graph points from InfluxDB (range: ${graphDuration / 3600000}h)`)
    } catch (err: any) {
      logger.error(`Failed to load graph points: ${err?.message}`)
    }
  }

  async loadRecords(): Promise<void> {
    if (!this._queryApi) return

    const { bucket } = config.influxdb

    for (const serverReg of this._app.serverRegistrations) {
      const serverName = serverReg.data.name
      const fluxQuery = `
        from(bucket: "${bucket}")
          |> range(start: 0)
          |> filter(fn: (r) => r["_measurement"] == "playerCount")
          |> filter(fn: (r) => r["_field"] == "playerCount")
          |> filter(fn: (r) => r["name"] == "${serverName}")
          |> max()
      `

      try {
        await new Promise<void>((resolve, reject) => {
          this._queryApi!.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
              const obj = tableMeta.toObject(row)
              const playerCount = obj._value as number
              const timestamp = new Date(obj._time as string).getTime()

              if (playerCount !== null && playerCount !== undefined) {
                serverReg.recordData = {
                  playerCount,
                  timestamp: TimeTracker.toSeconds(timestamp)
                }
              }
            },
            error: reject,
            complete: resolve
          })
        })
      } catch (err: any) {
        logger.error(`Failed to load record for ${serverName}: ${err?.message}`)
      }
    }
  }

  insertPing(
    ip: string,
    serverName: string,
    _serverType: string,
    timestamp: number,
    playerCount: number | null,
    latency: number | null
  ): void {
    if (!this._writeApi || config.influxdb.mode !== 'write') return

    const point = new Point('playerCount')
      .tag('name', serverName)
      .tag('ip', ip)
      .timestamp(timestamp)

    if (playerCount !== null) {
      point.intField('playerCount', playerCount)
    }

    if (latency !== null) {
      point.intField('latency', latency)
    }

    try {
      this._writeApi.writePoint(point)
    } catch (err: any) {
      logger.error(`Failed to write ping for ${serverName}: ${err?.message}`)
    }
  }

  async updatePlayerCountRecord(_ip: string, _playerCount: number, _timestamp: number): Promise<void> {
    // In InfluxDB, records are derived by querying max(playerCount).
    // No explicit update needed – insertPing handles this automatically.
  }

  async flush(): Promise<void> {
    if (this._writeApi) {
      try {
        await this._writeApi.flush()
      } catch (err: any) {
        logger.error(`InfluxDB flush error: ${err?.message}`)
      }
    }
  }

  async close(): Promise<void> {
    if (this._writeApi) {
      try {
        await this._writeApi.close()
      } catch (err: any) {
        logger.error(`InfluxDB close error: ${err?.message}`)
      }
    }
  }
}

