import crypto from 'crypto'
import { DNSResolver } from './dns'
import { GRAPH_UPDATE_TIME_GAP, TimeTracker } from './time'
import { getPlayerCountOrNull } from '../utils/message'
import { config } from '../config'
import type { App } from '../app'
import type { PingResult } from '../ping/pinger'

// Load minecraft versions - works with both Bun and Node
let minecraftVersionsData: Record<string, Array<{ name: string; protocolId: number }>>
try {
  minecraftVersionsData = require('../../minecraft_versions.json')
} catch {
  minecraftVersionsData = { PC: [], PE: [] }
}
const minecraftVersions = minecraftVersionsData

export interface RecordData {
  playerCount: number
  timestamp: number
}

export interface VersionUpdate {
  protocolId: number
  protocolIndex: number
}

export interface ServerUpdate {
  playerCount: number | null
  versions?: number[]
  recordData?: RecordData
  favicon?: string
  graphPeakData?: { playerCount: number; timestamp: number }
  error?: { message: string }
}

export class ServerRegistration {
  readonly serverId: number
  lastFavicon?: string
  faviconHash?: string
  versions: number[] = []
  recordData?: RecordData
  graphData: (number | null)[] = []

  private readonly _app: App
  private _pingHistory: (number | null)[] = []
  private _nextProtocolIndex?: number
  private _graphPeakIndex?: number

  public readonly dnsResolver: DNSResolver

  constructor(app: App, serverId: number, public readonly data: typeof config.servers[0]) {
    this._app = app
    this.serverId = serverId
    this.dnsResolver = new DNSResolver(data.ip, data.port)
  }

  handlePing(
    timestamp: number,
    resp: PingResult | undefined,
    err: Error | undefined,
    version: VersionUpdate,
    updateHistoryGraph: boolean
  ): ServerUpdate {
    const unsafePlayerCount = getPlayerCountOrNull(resp)

    TimeTracker.pushAndShift(this._pingHistory, unsafePlayerCount, TimeTracker.getMaxServerGraphDataLength())

    if (updateHistoryGraph) {
      TimeTracker.pushAndShift(this.graphData, unsafePlayerCount, TimeTracker.getMaxGraphDataLength())
    }

    return this._buildUpdate(timestamp, resp, err, version)
  }

  private _buildUpdate(
    timestamp: number,
    resp: PingResult | undefined,
    err: Error | undefined,
    version: VersionUpdate
  ): ServerUpdate {
    const update: ServerUpdate = {
      playerCount: getPlayerCountOrNull(resp)
    }

    if (resp) {
      if (resp.version !== undefined && this._updateProtocolVersionCompat(resp.version, version.protocolId, version.protocolIndex)) {
        update.versions = this.versions
      }

      if (config.influxdb.enabled && (!this.recordData || (resp.players.online > (this.recordData?.playerCount ?? 0)))) {
        this.recordData = {
          playerCount: resp.players.online,
          timestamp: TimeTracker.toSeconds(timestamp)
        }
        update.recordData = this.recordData

        if (this._app.database) {
          this._app.database.updatePlayerCountRecord(this.data.ip, resp.players.online, timestamp)
        }
      }

      if (this._updateFavicon(resp.favicon)) {
        update.favicon = this._getFaviconUrl()
      }

      if (config.influxdb.enabled) {
        if (this.findNewGraphPeak()) {
          update.graphPeakData = this.getGraphPeak()
        }
      }
    } else if (err) {
      update.error = this._filterError(err)
    }

    return update
  }

  getPingHistory() {
    if (this._pingHistory.length > 0) {
      const payload: Record<string, unknown> = {
        versions: this.versions,
        recordData: this.recordData,
        favicon: this._getFaviconUrl(),
        playerCount: this._pingHistory[this._pingHistory.length - 1],
        playerCountHistory: this._pingHistory
      }

      const graphPeakData = this.getGraphPeak()
      if (graphPeakData) {
        payload.graphPeakData = graphPeakData
      }

      return payload
    }

    return {
      error: { message: 'Pinging...' },
      recordData: this.recordData,
      graphPeakData: this.getGraphPeak(),
      favicon: this.data.favicon
    }
  }

  loadGraphPoints(startTime: number, timestamps: number[], points: (number | null)[]): void {
    this.graphData = TimeTracker.everyN(timestamps, startTime, GRAPH_UPDATE_TIME_GAP, i => points[i])
  }

  findNewGraphPeak(): boolean {
    let index = -1
    for (let i = 0; i < this.graphData.length; i++) {
      const point = this.graphData[i]
      if (point !== null && (index === -1 || point > (this.graphData[index] ?? 0))) {
        index = i
      }
    }
    if (index >= 0) {
      const lastIndex = this._graphPeakIndex
      this._graphPeakIndex = index
      return index !== lastIndex
    } else {
      this._graphPeakIndex = undefined
      return false
    }
  }

  getGraphPeak(): { playerCount: number; timestamp: number } | undefined {
    if (this._graphPeakIndex === undefined) return undefined
    return {
      playerCount: this.graphData[this._graphPeakIndex] as number,
      timestamp: this._app.timeTracker.getGraphPointAt(this._graphPeakIndex)
    }
  }

  private _updateFavicon(favicon?: string): boolean {
    if (this.data.favicon) return false
    if (favicon && favicon !== this.lastFavicon) {
      this.lastFavicon = favicon
      this.faviconHash = crypto.createHash('md5').update(favicon).digest('hex')
      return true
    }
    return false
  }

  private _getFaviconUrl(): string | undefined {
    if (this.faviconHash) {
      return `/hashedfavicon_${this.faviconHash}.png`
    } else if (this.data.favicon) {
      return this.data.favicon
    }
    return undefined
  }

  private _updateProtocolVersionCompat(incomingId: number, outgoingId: number, protocolIndex: number): boolean {
    const isSuccess = incomingId === outgoingId
    const indexOf = this.versions.indexOf(protocolIndex)

    if (isSuccess && indexOf < 0) {
      this.versions.push(protocolIndex)
      this.versions.sort((a, b) => a - b)
      return true
    } else if (!isSuccess && indexOf >= 0) {
      this.versions.splice(indexOf, 1)
      return true
    }
    return false
  }

  getNextProtocolVersion(): VersionUpdate {
    if (this.data.type === 'PE') {
      return { protocolId: 0, protocolIndex: 0 }
    }
    const protocolVersions = minecraftVersions[this.data.type] as Array<{ name: string; protocolId: number }>
    if (this._nextProtocolIndex === undefined || this._nextProtocolIndex + 1 >= protocolVersions.length) {
      this._nextProtocolIndex = 0
    } else {
      this._nextProtocolIndex++
    }
    return {
      protocolId: protocolVersions[this._nextProtocolIndex].protocolId,
      protocolIndex: this._nextProtocolIndex
    }
  }

  private _filterError(err: Error): { message: string } {
    let message = 'Unknown error'
    for (const key of ['message', 'description', 'errno'] as const) {
      const val = (err as any)[key]
      if (val) {
        message = String(val)
        break
      }
    }
    if (message.length > 28) {
      message = message.substring(0, 28) + '...'
    }
    return { message }
  }

  getPublicData() {
    return {
      name: this.data.name,
      ip: this.data.ip,
      type: this.data.type,
      color: this.data.color
    }
  }
}
