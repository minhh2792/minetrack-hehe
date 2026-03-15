import { config } from '../config'

export const GRAPH_UPDATE_TIME_GAP = 60 * 1000 // 60 seconds

export class TimeTracker {
  private _serverGraphPoints: number[] = []
  private _graphPoints: number[] = []
  private _lastHistoryGraphUpdate?: number

  newPointTimestamp(): { timestamp: number; updateHistoryGraph: boolean } {
    const timestamp = Date.now()

    TimeTracker.pushAndShift(this._serverGraphPoints, timestamp, TimeTracker.getMaxServerGraphDataLength())

    const updateHistoryGraph =
      config.influxdb.enabled &&
      config.influxdb.mode === 'write' &&
      (!this._lastHistoryGraphUpdate || timestamp - this._lastHistoryGraphUpdate >= GRAPH_UPDATE_TIME_GAP)

    if (updateHistoryGraph) {
      this._lastHistoryGraphUpdate = timestamp
      TimeTracker.pushAndShift(this._graphPoints, timestamp, TimeTracker.getMaxGraphDataLength())
    }

    return { timestamp, updateHistoryGraph }
  }

  loadGraphPoints(startTime: number, timestamps: number[]): void {
    this._graphPoints = TimeTracker.everyN(timestamps, startTime, GRAPH_UPDATE_TIME_GAP, i => timestamps[i])
  }

  getGraphPointAt(i: number): number {
    return TimeTracker.toSeconds(this._graphPoints[i])
  }

  getServerGraphPoints(): number[] {
    return this._serverGraphPoints.map(TimeTracker.toSeconds)
  }

  getGraphPoints(): number[] {
    return this._graphPoints.map(TimeTracker.toSeconds)
  }

  static toSeconds(timestamp: number): number {
    return Math.floor(timestamp / 1000)
  }

  static getMaxServerGraphDataLength(): number {
    return Math.ceil(config.serverGraphDuration / config.rates.pingAll)
  }

  static getMaxGraphDataLength(): number {
    return Math.ceil(config.graphDuration / GRAPH_UPDATE_TIME_GAP)
  }

  static everyN<T>(array: number[], start: number, diff: number, adapter: (i: number) => T): T[] {
    const selected: T[] = []
    let lastPoint = start
    for (let i = 0; i < array.length; i++) {
      const point = array[i]
      if (point - lastPoint >= diff) {
        lastPoint = point
        selected.push(adapter(i))
      }
    }
    return selected
  }

  static pushAndShift<T>(array: T[], value: T, maxLength: number): void {
    array.push(value)
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength)
    }
  }
}
