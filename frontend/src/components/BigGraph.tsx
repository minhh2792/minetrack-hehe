import React, { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { formatNumber, formatTimestampSeconds } from '../lib/format'
import type { ServerState } from '../types'

interface BigGraphProps {
  timestamps: number[]
  graphData: (number | null)[][]
  servers: ServerState[]
  isVisible: boolean
}

export function BigGraph({ timestamps, graphData, servers, isVisible }: BigGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)

  useEffect(() => {
    if (!containerRef.current || !timestamps.length) return
    if (plotRef.current) {
      plotRef.current.destroy()
      plotRef.current = null
    }

    const container = containerRef.current
    const width = container.offsetWidth || 800

    const series: uPlot.Series[] = [
      {},
      ...servers.map((server, i) => ({
        label: server.data.name,
        stroke: server.data.color,
        width: 2,
        show: server.isVisible,
        spanGaps: true,
        points: { show: false }
      }))
    ]

    // Build data: [timestamps, ...playerCounts per server]
    const data: (number | null)[][] = [
      timestamps,
      ...servers.map((_, i) => graphData[i] || [])
    ]

    const opts: uPlot.Options = {
      width,
      height: 300,
      series,
      axes: [
        {
          stroke: '#999',
          grid: { stroke: '#333', width: 1 },
          ticks: { stroke: '#333' },
          values: (_u, vals) => vals.map(v => {
            const d = new Date(v * 1000)
            return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
          })
        },
        {
          stroke: '#999',
          grid: { stroke: '#333', width: 1 },
          ticks: { stroke: '#333' },
          values: (_u, vals) => vals.map(v => v !== null ? formatNumber(v) : '')
        }
      ],
      cursor: {
        sync: { key: 'main-graph' }
      },
      legend: { show: false }
    }

    plotRef.current = new uPlot(opts, data as uPlot.AlignedData, container)

    return () => {
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [timestamps, graphData, servers])

  // Update series visibility when servers change
  useEffect(() => {
    if (!plotRef.current) return
    servers.forEach((server, i) => {
      plotRef.current!.setSeries(i + 1, { show: server.isVisible })
    })
  }, [servers])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (plotRef.current && containerRef.current) {
        plotRef.current.setSize({ width: containerRef.current.offsetWidth, height: 300 })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isVisible || !timestamps.length) return null

  return (
    <div className="px-5 py-2">
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
