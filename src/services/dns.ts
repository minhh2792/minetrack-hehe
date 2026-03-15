import dns from 'dns'
import { config } from '../config'
import { logger } from '../logger'

const SKIP_SRV_TIMEOUT = config.skip_srv_timeout

export class DNSResolver {
  private readonly _ip: string
  private readonly _port?: number
  private _skipSrvUntil?: number

  constructor(ip: string, port?: number) {
    this._ip = ip
    this._port = port
  }

  private _skipSrv(): void {
    this._skipSrvUntil = Date.now() + SKIP_SRV_TIMEOUT
  }

  private _isSkipSrv(): boolean {
    return !!this._skipSrvUntil && Date.now() <= this._skipSrvUntil
  }

  resolve(callback: (host: string, port: number | undefined, remainingTimeout: number) => void): void {
    if (this._isSkipSrv()) {
      callback(this._ip, this._port, config.rates.connectTimeout)
      return
    }

    const startTime = Date.now()
    let callbackFired = false

    const fireCallback = (ip?: string, port?: number) => {
      if (!callbackFired) {
        callbackFired = true
        const remainingTime = config.rates.connectTimeout - (Date.now() - startTime)
        callback(ip || this._ip, port || this._port, Math.max(remainingTime, 0))
      }
    }

    const timeoutHandle = setTimeout(() => fireCallback(), config.rates.connectTimeout)

    dns.resolveSrv('_minecraft._tcp.' + this._ip, (err, records) => {
      if (!callbackFired) clearTimeout(timeoutHandle)

      if ((err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL')) || !records || records.length === 0) {
        const isSkipSrvTimeoutDisabled = SKIP_SRV_TIMEOUT === 0
        if (!this._isSkipSrv() && !isSkipSrvTimeoutDisabled) {
          this._skipSrv()
          logger.warn(`No SRV records for ${this._ip}. Skipping SRV for ${SKIP_SRV_TIMEOUT / (60 * 1000)} minutes.`)
        }
        fireCallback()
      } else if (!err && records.length > 0) {
        fireCallback(records[0].name, records[0].port)
      } else {
        if (err) logger.error(`DNS error for ${this._ip}: ${err.message}`)
        fireCallback()
      }
    })
  }
}
