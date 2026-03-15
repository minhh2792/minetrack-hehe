import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useServerRegistry } from './hooks/useServerRegistry'
import { Header } from './components/Header'
import { BigGraph } from './components/BigGraph'
import { GraphControls } from './components/GraphControls'
import { PercentageBar } from './components/PercentageBar'
import { ServerList } from './components/ServerList'
import { StatusOverlay } from './components/StatusOverlay'
import type { WebSocketMessage, PublicConfig } from './types'
import { getLocalStorage, setLocalStorage, removeLocalStorage, SORT_OPTION_KEY } from './lib/storage'

type SortKey = 'players' | 'peak' | 'record'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'players', label: 'Players' },
  { key: 'peak', label: 'Peak' },
  { key: 'record', label: 'Record' }
]

export default function App() {
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null)
  const [isPageReady, setIsPageReady] = useState(false)
  const [statusText, setStatusText] = useState('Connecting...')

  // Graph data
  const [historyTimestamps, setHistoryTimestamps] = useState<number[]>([])
  const [historyGraphData, setHistoryGraphData] = useState<(number | null)[][]>([])
  const [isGraphControlsOpen, setIsGraphControlsOpen] = useState(false)

  // Sort
  const [sortIndex, setSortIndex] = useState(() => getLocalStorage<number>(SORT_OPTION_KEY) ?? 0)

  const {
    servers,
    serversRef,
    initServers,
    updateServers,
    toggleVisibility,
    setAllVisibility,
    toggleFavorite,
    resetServers
  } = useServerRegistry(publicConfig)

  const hasRequestedHistoryRef = useRef(false)

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    switch (msg.message) {
      case 'init': {
        setPublicConfig(msg.config)
        setIsPageReady(true)

        initServers(msg.servers, msg.timestampPoints, msg.config)

        // Request history graph if enabled
        if (msg.config.isGraphVisible && !hasRequestedHistoryRef.current) {
          hasRequestedHistoryRef.current = true
          send('requestHistoryGraph')
        }
        break
      }

      case 'updateServers': {
        updateServers(msg.updates, msg.timestamp)

        if (msg.updateHistoryGraph) {
          setHistoryTimestamps(prev => {
            const next = [...prev, msg.timestamp]
            const maxLen = publicConfig?.graphMaxLength ?? 1440
            return next.length > maxLen ? next.slice(-maxLen) : next
          })

          setHistoryGraphData(prev => {
            const next = prev.map((series, i) => {
              const update = msg.updates[i]
              const playerCount = update?.playerCount ?? null
              const newSeries = [...series, playerCount]
              const maxLen = publicConfig?.graphMaxLength ?? 1440
              return newSeries.length > maxLen ? newSeries.slice(-maxLen) : newSeries
            })
            return next
          })
        }
        break
      }

      case 'historyGraph': {
        setHistoryTimestamps(msg.timestamps)
        setHistoryGraphData(msg.graphData)
        break
      }
    }
  }, [initServers, updateServers, publicConfig])

  const handleDisconnect = useCallback(() => {
    setIsPageReady(false)
    resetServers()
    hasRequestedHistoryRef.current = false
    setHistoryTimestamps([])
    setHistoryGraphData([])
    setPublicConfig(null)
  }, [resetServers])

  const { send, statusText: wsStatusText } = useWebSocket({
    onMessage: handleMessage,
    onClose: () => handleDisconnect()
  })

  // Sync status text
  useEffect(() => {
    if (!isPageReady) {
      setStatusText(wsStatusText)
    }
  }, [wsStatusText, isPageReady])

  const totalPlayers = servers.reduce((sum, s) => sum + (s.playerCount || 0), 0)

  const currentSortOption = SORT_OPTIONS[sortIndex % SORT_OPTIONS.length]

  const handleSortClick = useCallback(() => {
    const nextIndex = (sortIndex + 1) % SORT_OPTIONS.length
    setSortIndex(nextIndex)
    if (nextIndex !== 0) {
      setLocalStorage(SORT_OPTION_KEY, nextIndex)
    } else {
      removeLocalStorage(SORT_OPTION_KEY)
    }
  }, [sortIndex])

  return (
    <>
      <StatusOverlay text={statusText} isVisible={!isPageReady} />

      {isPageReady && publicConfig && (
        <div className="min-h-screen flex flex-col">
          <PercentageBar servers={servers} totalPlayers={totalPlayers} />

          <Header
            totalPlayers={totalPlayers}
            networkCount={servers.length}
            sortLabel={currentSortOption.label}
            onSortClick={handleSortClick}
            onGraphControlsToggle={() => setIsGraphControlsOpen(open => !open)}
          />

          {publicConfig.isGraphVisible && historyTimestamps.length > 0 && (
            <>
              <BigGraph
                timestamps={historyTimestamps}
                graphData={historyGraphData}
                servers={servers}
                isVisible={true}
              />

              <GraphControls
                servers={servers}
                isOpen={isGraphControlsOpen}
                onToggleServer={toggleVisibility}
                onShowAll={() => setAllVisibility(true)}
                onHideAll={() => setAllVisibility(false)}
                onShowFavorites={() => setAllVisibility(false, true)}
              />
            </>
          )}

          <ServerList
            servers={servers}
            sortKey={currentSortOption.key}
            minecraftVersions={publicConfig.minecraftVersions}
            graphDurationLabel={publicConfig.graphDurationLabel}
            onFavoriteToggle={toggleFavorite}
          />

          <footer className="mt-auto py-4 text-center text-gray-600 text-sm border-t border-mc-border">
            Powered by open source software —{' '}
            <a
              href="https://github.com/minhh2792/minetrack-hehe"
              className="text-mc-blue hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              make it your own!
            </a>
          </footer>
        </div>
      )}
    </>
  )
}
