export interface ServerData {
  name: string
  ip: string
  type: 'PC' | 'PE'
  color: string
}

export interface RecordData {
  playerCount: number
  timestamp: number
}

export interface GraphPeakData {
  playerCount: number
  timestamp: number
}

export interface ServerPayload {
  playerCount?: number | null
  playerCountHistory?: (number | null)[]
  versions?: number[]
  recordData?: RecordData
  graphPeakData?: GraphPeakData
  favicon?: string
  error?: { message: string }
}

export interface ServerUpdate {
  playerCount?: number | null
  versions?: number[]
  recordData?: RecordData
  graphPeakData?: GraphPeakData
  favicon?: string
  error?: { message: string }
}

export interface PublicConfig {
  graphDurationLabel: string
  graphMaxLength: number
  serverGraphMaxLength: number
  servers: ServerData[]
  minecraftVersions: Record<string, string[]>
  isGraphVisible: boolean
}

export interface InitMessage {
  message: 'init'
  config: PublicConfig
  timestampPoints: number[]
  servers: ServerPayload[]
}

export interface UpdateServersMessage {
  message: 'updateServers'
  timestamp: number
  updateHistoryGraph: boolean
  updates: (ServerUpdate | null)[]
}

export interface HistoryGraphMessage {
  message: 'historyGraph'
  timestamps: number[]
  graphData: (number | null)[][]
}

export type WebSocketMessage = InitMessage | UpdateServersMessage | HistoryGraphMessage

export interface ServerState {
  serverId: number
  data: ServerData
  playerCount: number
  playerCountHistory: (number | null)[]
  versions: number[]
  recordData?: RecordData
  graphPeakData?: GraphPeakData
  favicon?: string
  error?: { message: string }
  isVisible: boolean
  isFavorite: boolean
  rankIndex?: number
}
