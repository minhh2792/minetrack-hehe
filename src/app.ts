import { config } from './config'
import { logger } from './logger'
import { TimeTracker } from './services/time'
import { ServerRegistration } from './services/servers'
import { PingController } from './ping/controller'
import { WebServer } from './server/http'
import { InfluxDatabase } from './database/influxdb'
import { messageOf } from './utils/message'

// Load minecraft versions
let minecraftVersionsData: Record<string, Array<{ name: string; protocolId: number }>>
try {
  minecraftVersionsData = require('../minecraft_versions.json')
} catch {
  minecraftVersionsData = { PC: [], PE: [] }
}

export class App {
  readonly serverRegistrations: ServerRegistration[] = []
  readonly timeTracker: TimeTracker
  readonly server: WebServer
  readonly pingController: PingController
  database?: InfluxDatabase

  constructor() {
    this.timeTracker = new TimeTracker()
    this.server = new WebServer(this)
    this.pingController = new PingController(this)
  }

  async init(): Promise<void> {
    // Initialize server registrations from config
    config.servers.forEach((serverData, serverId) => {
      this.serverRegistrations.push(new ServerRegistration(this, serverId, serverData))
    })

    if (config.influxdb.enabled) {
      this.database = new InfluxDatabase(this)
      this.database.connect()

      logger.info('Loading data from InfluxDB...')
      await this.database.loadGraphPoints(config.graphDuration)
      await this.database.loadRecords()
      logger.info('InfluxDB data loaded')

      // Compute initial graph peaks
      for (const serverReg of this.serverRegistrations) {
        serverReg.findNewGraphPeak()
      }
    } else {
      logger.info('InfluxDB disabled - running without persistent storage')
    }

    // Setup and start HTTP/WebSocket server
    this.server.setup()
    this.server.listen(config.site.host, config.site.port)

    // Start pinging (only in write mode or without influxdb)
    if (!config.influxdb.enabled || config.influxdb.mode === 'write') {
      this.pingController.schedule()
      logger.info('Ping controller started')
    } else {
      logger.info('Running in READ-ONLY mode - ping controller disabled')
    }

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown())
    process.on('SIGINT', () => this.shutdown())
  }

  handleClientConnection(ws: any): void {
    const minecraftVersionNames: Record<string, string[]> = {}
    for (const key of Object.keys(minecraftVersionsData)) {
      minecraftVersionNames[key] = (minecraftVersionsData[key] as Array<{ name: string }>).map(v => v.name)
    }

    const initMessage = {
      config: {
        graphDurationLabel: config.graphDurationLabel,
        graphMaxLength: TimeTracker.getMaxGraphDataLength(),
        serverGraphMaxLength: TimeTracker.getMaxServerGraphDataLength(),
        servers: this.serverRegistrations.map(s => s.getPublicData()),
        minecraftVersions: minecraftVersionNames,
        isGraphVisible: config.influxdb.enabled
      },
      timestampPoints: this.timeTracker.getServerGraphPoints(),
      servers: this.serverRegistrations.map(s => s.getPingHistory())
    }

    ws.send(messageOf('init', initMessage as unknown as Record<string, unknown>))
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down...')
    this.pingController.stop()
    if (this.database) {
      await this.database.close()
    }
    process.exit(0)
  }
}
