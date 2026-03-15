import React, { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { formatNumber, formatTimestampSeconds, formatMinecraftVersions, formatDate } from '../lib/format'
import type { ServerState } from '../types'

const MISSING_FAVICON = '/images/missing_favicon.svg'

interface ServerCardProps {
  server: ServerState
  minecraftVersions: Record<string, string[]>
  graphDurationLabel: string
  onFavoriteToggle: () => void
  rankIndex?: number
}

export function ServerCard({ server, minecraftVersions, graphDurationLabel, onFavoriteToggle, rankIndex }: ServerCardProps) {
  const miniGraphRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const playerCount = server.playerCount
  const hasError = !!server.error
  const isOnline = !hasError && playerCount !== null && playerCount !== undefined

  useEffect(() => {
    if (!miniGraphRef.current || !server.playerCountHistory?.length) return

    if (plotRef.current) {
      plotRef.current.destroy()
      plotRef.current = null
    }

    const container = miniGraphRef.current
    const width = container.offsetWidth || 300
    const height = 80

    const timestamps = server.playerCountHistory.map((_, i) => i)
    const data: uPlot.AlignedData = [timestamps as number[], server.playerCountHistory as (number | null)[]]

    const opts: uPlot.Options = {
      width,
      height,
      series: [
        {},
        {
          stroke: server.data.color,
          width: 1.5,
          fill: server.data.color + '33',
          spanGaps: true,
          points: { show: false }
        }
      ],
      axes: [
        { show: false },
        { show: false }
      ],
      cursor: { show: false },
      legend: { show: false },
      padding: [0, 0, 0, 0]
    }

    plotRef.current = new uPlot(opts, data, container)

    return () => {
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [server.playerCountHistory, server.data.color])

  // Update plot data when history changes
  useEffect(() => {
    if (!plotRef.current || !server.playerCountHistory?.length) return
    const timestamps = server.playerCountHistory.map((_, i) => i)
    plotRef.current.setData([timestamps as number[], server.playerCountHistory as (number | null)[]])
  }, [server.playerCountHistory])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (plotRef.current && miniGraphRef.current) {
        plotRef.current.setSize({ width: miniGraphRef.current.offsetWidth, height: 80 })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const versionStr = formatMinecraftVersions(server.versions, minecraftVersions[server.data.type] || [])

  return (
    <div
      ref={containerRef}
      id={`container_${server.serverId}`}
      className="bg-mc-card border border-mc-border rounded p-4 relative"
    >
      {/* Color bar on left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
        style={{ backgroundColor: server.data.color }}
      />

      <div className="pl-2 flex flex-col gap-2">
        {/* Top row: rank, favicon, name, favorite, status */}
        <div className="flex items-start gap-3">
          {/* Rank */}
          {rankIndex !== undefined && (
            <span className="text-gray-500 text-sm mt-0.5 min-w-[1.5rem] text-right">
              #{rankIndex + 1}
            </span>
          )}

          {/* Favicon */}
          <img
            src={server.favicon || MISSING_FAVICON}
            alt=""
            className="w-8 h-8 rounded mt-0.5"
            onError={(e) => { (e.target as HTMLImageElement).src = MISSING_FAVICON }}
          />

          {/* Server info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg leading-tight">{server.data.name}</h2>
              <span className="text-gray-500 text-xs">{server.data.ip}</span>
              {server.data.type === 'PE' && (
                <span className="text-xs px-1.5 py-0.5 bg-mc-purple/20 text-mc-purple-light rounded">Bedrock</span>
              )}
              <button
                onClick={onFavoriteToggle}
                className="text-mc-gold ml-auto"
                aria-label={server.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {server.isFavorite ? '★' : '☆'}
              </button>
            </div>

            {versionStr && (
              <p className="text-gray-400 text-xs mt-0.5">MC {versionStr}</p>
            )}
          </div>
        </div>

        {/* Mini graph */}
        <div ref={miniGraphRef} className="w-full h-20" />

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {/* Current players */}
          <div>
            <div className="text-gray-400 text-xs">Players</div>
            {hasError ? (
              <div className="text-red-400 text-sm">{server.error?.message}</div>
            ) : (
              <div
                className="font-bold text-lg"
                style={{ color: server.data.color }}
                data-highlight="player-count"
              >
                {formatNumber(playerCount)}
              </div>
            )}
          </div>

          {/* Peak */}
          {server.graphPeakData && (
            <div>
              <div className="text-gray-400 text-xs">{graphDurationLabel} Peak</div>
              <div className="font-bold" data-highlight="peak">
                {formatNumber(server.graphPeakData.playerCount)}
              </div>
              <div className="text-gray-500 text-xs">{formatDate(server.graphPeakData.timestamp)}</div>
            </div>
          )}

          {/* Record */}
          {server.recordData?.playerCount !== null && server.recordData?.playerCount !== undefined && (
            <div>
              <div className="text-gray-400 text-xs">Record</div>
              <div className="font-bold" data-highlight="record">
                {formatNumber(server.recordData.playerCount)}
              </div>
              {server.recordData.timestamp && (
                <div className="text-gray-500 text-xs">{formatDate(server.recordData.timestamp)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
