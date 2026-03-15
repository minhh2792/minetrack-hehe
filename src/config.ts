import { logger } from './logger'

export interface ServerConfig {
  name: string
  ip: string
  type: 'PC' | 'PE'
  port?: number
  color?: string
  favicon?: string
}

export interface AppConfig {
  site: {
    port: number
    host: string
  }
  rates: {
    pingAll: number
    connectTimeout: number
  }
  graphDuration: number
  graphDurationLabel: string
  serverGraphDuration: number
  logFailedPings: boolean
  influxdb: {
    url: string
    token: string
    org: string
    bucket: string
    mode: 'read' | 'write'
    enabled: boolean
  }
  servers: ServerConfig[]
  site_title: string
  skip_srv_timeout: number
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

function getEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key]
  if (!val) return defaultValue
  const parsed = parseInt(val, 10)
  if (isNaN(parsed)) {
    logger.warn(`Invalid integer value for ${key}: "${val}", using default: ${defaultValue}`)
    return defaultValue
  }
  return parsed
}

function loadServers(): ServerConfig[] {
  try {
    // Use require() for synchronous loading (works in both Bun and Node)
    return require('../servers.json') as ServerConfig[]
  } catch {
    logger.warn('Could not load servers.json, using empty server list')
    return []
  }
}

function generateColor(name: string): string {
  let hash = 0
  for (let i = name.length - 1; i >= 0; i--) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16)
  return '#' + Array(6 - color.length + 1).join('0') + color
}

const rawServers = loadServers()

const servers: ServerConfig[] = rawServers.map(server => ({
  ...server,
  color: server.color || generateColor(server.name)
}))

const graphDurationMs = getEnvInt('GRAPH_DURATION', 86400000)
const graphDurationHours = Math.floor(graphDurationMs / (60 * 60 * 1000))

export const config: AppConfig = {
  site: {
    port: getEnvInt('PORT', 8080),
    host: getEnv('HOST', '0.0.0.0')
  },
  rates: {
    pingAll: getEnvInt('PING_INTERVAL', 3000),
    connectTimeout: getEnvInt('PING_TIMEOUT', 2500)
  },
  graphDuration: graphDurationMs,
  graphDurationLabel: getEnv('GRAPH_DURATION_LABEL', `${graphDurationHours}h`),
  serverGraphDuration: getEnvInt('SERVER_GRAPH_DURATION', 180000),
  logFailedPings: getEnv('LOG_FAILED_PINGS', 'true') === 'true',
  influxdb: {
    url: getEnv('INFLUXDB_URL', 'http://localhost:8086'),
    token: getEnv('INFLUXDB_TOKEN', ''),
    org: getEnv('INFLUXDB_ORG', ''),
    bucket: getEnv('INFLUXDB_BUCKET', 'minetrack'),
    mode: (getEnv('INFLUXDB_MODE', 'write') as 'read' | 'write'),
    enabled: getEnv('INFLUXDB_ENABLED', 'false') === 'true'
  },
  servers,
  site_title: getEnv('SITE_TITLE', 'Minetrack'),
  skip_srv_timeout: getEnvInt('SKIP_SRV_TIMEOUT', 60 * 60 * 1000)
}
