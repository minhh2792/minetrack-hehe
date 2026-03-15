import React, { useMemo } from 'react'
import { ServerCard } from './ServerCard'
import type { ServerState } from '../types'
import { SORT_OPTION_KEY, getLocalStorage } from '../lib/storage'

type SortKey = 'players' | 'peak' | 'record'

interface ServerListProps {
  servers: ServerState[]
  sortKey: SortKey
  minecraftVersions: Record<string, string[]>
  graphDurationLabel: string
  onFavoriteToggle: (serverId: number) => void
}

export function ServerList({ servers, sortKey, minecraftVersions, graphDurationLabel, onFavoriteToggle }: ServerListProps) {
  const sortedServers = useMemo(() => {
    const sorted = [...servers].sort((a, b) => {
      // Favorites always first
      if (a.isFavorite && !b.isFavorite) return -1
      if (b.isFavorite && !a.isFavorite) return 1

      switch (sortKey) {
        case 'players':
          return (b.playerCount || 0) - (a.playerCount || 0)
        case 'peak': {
          const aPeak = a.graphPeakData?.playerCount
          const bPeak = b.graphPeakData?.playerCount
          if (!aPeak && !bPeak) return 0
          if (aPeak && !bPeak) return -1
          if (!aPeak && bPeak) return 1
          return (bPeak ?? 0) - (aPeak ?? 0)
        }
        case 'record': {
          const aRec = a.recordData?.playerCount
          const bRec = b.recordData?.playerCount
          if (!aRec && !bRec) return 0
          if (aRec && !bRec) return -1
          if (!aRec && bRec) return 1
          return (bRec ?? 0) - (aRec ?? 0)
        }
        default:
          return 0
      }
    })

    // Assign rank indices based on playerCount only
    const rankSort = [...servers].sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0))
    sorted.forEach(s => {
      s.rankIndex = rankSort.findIndex(r => r.serverId === s.serverId)
    })

    return sorted
  }, [servers, sortKey])

  return (
    <div className="px-5 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedServers.map(server => (
          <ServerCard
            key={server.serverId}
            server={server}
            minecraftVersions={minecraftVersions}
            graphDurationLabel={graphDurationLabel}
            onFavoriteToggle={() => onFavoriteToggle(server.serverId)}
            rankIndex={server.rankIndex}
          />
        ))}
      </div>
    </div>
  )
}
