import React, { useState } from 'react'
import type { ServerState } from '../types'
import { formatNumber, formatPercent } from '../lib/format'

interface PercentageBarProps {
  servers: ServerState[]
  totalPlayers: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  content: string
}

export function PercentageBar({ servers, totalPlayers }: PercentageBarProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' })

  if (totalPlayers === 0) return null

  const sortedServers = [...servers].sort((a, b) => a.playerCount - b.playerCount)

  return (
    <div className="relative">
      <div className="w-full h-2 flex">
        {sortedServers.map(server => {
          const width = totalPlayers > 0 ? (server.playerCount / totalPlayers) * 100 : 0
          return (
            <div
              key={server.serverId}
              className="h-full transition-all duration-300 cursor-pointer"
              style={{ width: `${width}%`, backgroundColor: server.data.color }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltip({
                  visible: true,
                  x: rect.left + window.scrollX,
                  y: rect.bottom + window.scrollY + 8,
                  content: `${server.data.name}: ${formatNumber(server.playerCount)} (${formatPercent(server.playerCount, totalPlayers)})`
                })
              }}
              onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
            />
          )
        })}
      </div>

      {tooltip.visible && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
