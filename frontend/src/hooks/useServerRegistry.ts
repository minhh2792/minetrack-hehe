import { useState, useCallback, useRef } from 'react'
import type { ServerState, ServerPayload, ServerUpdate, PublicConfig } from '../types'
import { getLocalStorage, setLocalStorage, removeLocalStorage, FAVORITE_SERVERS_KEY, HIDDEN_SERVERS_KEY, SHOW_FAVORITES_KEY } from '../lib/storage'

export function useServerRegistry(publicConfig: PublicConfig | null) {
  const [servers, setServers] = useState<ServerState[]>([])
  const serversRef = useRef<ServerState[]>([])

  const initServers = useCallback((serverPayloads: ServerPayload[], timestampPoints: number[], config: PublicConfig) => {
    const newServers: ServerState[] = config.servers.map((data, serverId) => {
      const payload = serverPayloads[serverId] || {}
      return {
        serverId,
        data,
        playerCount: payload.playerCount ?? 0,
        playerCountHistory: payload.playerCountHistory || [],
        versions: payload.versions || [],
        recordData: payload.recordData,
        graphPeakData: payload.graphPeakData,
        favicon: payload.favicon,
        error: payload.error,
        isVisible: true,
        isFavorite: false,
        rankIndex: undefined
      }
    })

    // Apply saved visibility settings
    const showOnlyFavorites = getLocalStorage<boolean>(SHOW_FAVORITES_KEY)
    let savedNames: string[] | null = null

    if (showOnlyFavorites) {
      savedNames = getLocalStorage<string[]>(FAVORITE_SERVERS_KEY)
    } else {
      savedNames = getLocalStorage<string[]>(HIDDEN_SERVERS_KEY)
    }

    if (savedNames) {
      newServers.forEach(s => {
        if (showOnlyFavorites) {
          s.isVisible = savedNames!.includes(s.data.name)
        } else {
          s.isVisible = !savedNames!.includes(s.data.name)
        }
      })
    }

    // Apply favorite settings
    const favoriteNames = getLocalStorage<string[]>(FAVORITE_SERVERS_KEY) || []
    newServers.forEach(s => {
      s.isFavorite = favoriteNames.includes(s.data.name)
    })

    serversRef.current = newServers
    setServers([...newServers])
  }, [])

  const updateServers = useCallback((updates: (ServerUpdate | null)[], timestamp: number) => {
    const updated = [...serversRef.current]
    let changed = false

    updates.forEach((update, serverId) => {
      if (!update || serverId >= updated.length) return
      const server = { ...updated[serverId] }

      if (update.playerCount !== undefined) {
        server.playerCount = update.playerCount ?? 0
        // Push into history
        const newHistory = [...server.playerCountHistory, update.playerCount]
        if (newHistory.length > 100) newHistory.shift()
        server.playerCountHistory = newHistory
      }

      if (update.versions !== undefined) server.versions = update.versions
      if (update.recordData !== undefined) server.recordData = update.recordData
      if (update.graphPeakData !== undefined) server.graphPeakData = update.graphPeakData
      if (update.favicon !== undefined) server.favicon = update.favicon
      if (update.error !== undefined) {
        server.error = update.error
      } else if (update.playerCount !== undefined) {
        server.error = undefined
      }

      updated[serverId] = server
      changed = true
    })

    if (changed) {
      serversRef.current = updated
      setServers([...updated])
    }
  }, [])

  const toggleVisibility = useCallback((serverId: number) => {
    const updated = [...serversRef.current]
    updated[serverId] = { ...updated[serverId], isVisible: !updated[serverId].isVisible }
    serversRef.current = updated
    setServers([...updated])

    // Save to localStorage
    const hiddenNames = updated.filter(s => !s.isVisible).map(s => s.data.name)
    if (hiddenNames.length > 0) {
      setLocalStorage(HIDDEN_SERVERS_KEY, hiddenNames)
    } else {
      removeLocalStorage(HIDDEN_SERVERS_KEY)
    }
  }, [])

  const setAllVisibility = useCallback((visible: boolean, onlyFavorites = false) => {
    const updated = serversRef.current.map(s => ({
      ...s,
      isVisible: onlyFavorites ? s.isFavorite : visible
    }))
    serversRef.current = updated
    setServers([...updated])

    if (onlyFavorites) {
      setLocalStorage(SHOW_FAVORITES_KEY, true)
    } else {
      removeLocalStorage(SHOW_FAVORITES_KEY)
      if (!visible) {
        setLocalStorage(HIDDEN_SERVERS_KEY, updated.map(s => s.data.name))
      } else {
        removeLocalStorage(HIDDEN_SERVERS_KEY)
      }
    }
  }, [])

  const toggleFavorite = useCallback((serverId: number) => {
    const updated = [...serversRef.current]
    updated[serverId] = { ...updated[serverId], isFavorite: !updated[serverId].isFavorite }
    serversRef.current = updated
    setServers([...updated])

    const favoriteNames = updated.filter(s => s.isFavorite).map(s => s.data.name)
    if (favoriteNames.length > 0) {
      setLocalStorage(FAVORITE_SERVERS_KEY, favoriteNames)
    } else {
      removeLocalStorage(FAVORITE_SERVERS_KEY)
    }
  }, [])

  const resetServers = useCallback(() => {
    serversRef.current = []
    setServers([])
  }, [])

  return {
    servers,
    serversRef,
    initServers,
    updateServers,
    toggleVisibility,
    setAllVisibility,
    toggleFavorite,
    resetServers
  }
}
