import React from 'react'
import { formatNumber } from '../lib/format'

interface HeaderProps {
  totalPlayers: number
  networkCount: number
  sortLabel: string
  onSortClick: () => void
  onGraphControlsToggle: () => void
}

export function Header({ totalPlayers, networkCount, sortLabel, onSortClick, onGraphControlsToggle }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between px-5 py-5 gap-4">
      <div className="flex items-center gap-3">
        <img src="/images/logo.svg" alt="Minetrack" className="w-10 h-10" />
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Minetrack</h1>
          <p className="text-gray-400 text-sm font-light mt-0.5">
            Counting{' '}
            <span className="text-white font-bold">{formatNumber(totalPlayers)}</span>
            {' '}players on{' '}
            <span className="text-white font-bold">{networkCount}</span>
            {' '}Minecraft servers.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSortClick}
          className="flex flex-col items-center px-4 py-2 bg-mc-card border border-mc-border rounded text-sm hover:bg-mc-border transition-colors cursor-pointer"
        >
          <span className="text-gray-400 text-xs">Sort By</span>
          <strong className="text-white">{sortLabel}</strong>
        </button>

        <button
          onClick={onGraphControlsToggle}
          className="px-4 py-2 bg-mc-card border border-mc-border rounded text-sm hover:bg-mc-border transition-colors cursor-pointer"
        >
          Graph Controls
        </button>
      </div>
    </header>
  )
}
