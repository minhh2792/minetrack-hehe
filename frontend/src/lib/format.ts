// Minecraft Java Edition default server port: 25565
// Minecraft Bedrock Edition default server port: 19132
const MINECRAFT_DEFAULT_PORTS = [25565, 19132]

export function formatMinecraftServerAddress(ip: string, port?: number): string {
  if (port && !MINECRAFT_DEFAULT_PORTS.includes(port)) {
    return `${ip}:${port}`
  }
  return ip
}

export function formatMinecraftVersions(versions: number[], knownVersions: string[]): string | undefined {
  if (!versions?.length || !knownVersions?.length) return undefined

  let currentGroup: number[] = []
  const groups: number[][] = []

  for (let i = 0; i < versions.length; i++) {
    if (i > 0 && versions[i] - versions[i - 1] !== 1) {
      groups.push(currentGroup)
      currentGroup = []
    }
    currentGroup.push(versions[i])
  }
  if (currentGroup.length > 0) groups.push(currentGroup)
  if (groups.length === 0) return undefined

  return groups.map(group => {
    const start = knownVersions[group[0]]
    if (group.length === 1) return start
    return `${start}-${knownVersions[group[group.length - 1]]}`
  }).join(', ')
}

export function formatTimestampSeconds(secs: number): string {
  const date = new Date(0)
  date.setUTCSeconds(secs)
  return date.toLocaleTimeString()
}

export function formatDate(secs: number): string {
  const date = new Date(0)
  date.setUTCSeconds(secs)
  return date.toLocaleDateString()
}

export function formatPercent(x: number, over: number): string {
  const val = Math.round((x / over) * 100 * 10) / 10
  return `${val}%`
}

export function formatNumber(x: number | null | undefined): string {
  if (typeof x !== 'number') return '-'
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
