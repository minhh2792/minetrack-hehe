import React from 'react'
import type { ServerState } from '../types'

interface GraphControlsProps {
  servers: ServerState[]
  isOpen: boolean
  onToggleServer: (serverId: number) => void
  onShowAll: () => void
  onHideAll: () => void
  onShowFavorites: () => void
}

export function GraphControls({ servers, isOpen, onToggleServer, onShowAll, onHideAll, onShowFavorites }: GraphControlsProps) {
  if (!isOpen) return null

  const sortedServers = [...servers].sort((a, b) => a.data.name.localeCompare(b.data.name))

  return (
    <div className="mx-5 mb-4 p-4 bg-mc-card border border-mc-border rounded">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={onShowAll}
          className="px-3 py-1 text-xs bg-mc-border hover:bg-gray-600 rounded transition-colors"
        >
          Show All
        </button>
        <button
          onClick={onHideAll}
          className="px-3 py-1 text-xs bg-mc-border hover:bg-gray-600 rounded transition-colors"
        >
          Hide All
        </button>
        <button
          onClick={onShowFavorites}
          className="px-3 py-1 text-xs bg-mc-gold/20 hover:bg-mc-gold/30 text-mc-gold rounded transition-colors"
        >
          ★ Only Favorites
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {sortedServers.map(server => (
          <label key={server.serverId} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={server.isVisible}
              onChange={() => onToggleServer(server.serverId)}
              className="w-3.5 h-3.5 rounded cursor-pointer"
            />
            <span
              className="text-sm"
              style={{ color: server.data.color }}
            >
              {server.data.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
