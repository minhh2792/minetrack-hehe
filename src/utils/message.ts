export function messageOf(name: string, data: Record<string, unknown>): string {
  return JSON.stringify({ message: name, ...data })
}

export function getPlayerCountOrNull(resp?: { players: { online: number } }): number | null {
  return resp?.players.online ?? null
}
