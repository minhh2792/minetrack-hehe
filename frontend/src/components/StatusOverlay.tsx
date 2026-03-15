import React from 'react'

interface StatusOverlayProps {
  text: string
  isVisible: boolean
}

export function StatusOverlay({ text, isVisible }: StatusOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-mc-dark z-50">
      <img src="/images/logo.svg" alt="Minetrack" className="w-16 h-16 mb-4" />
      <h1 className="text-4xl font-bold tracking-tighter mb-4">Minetrack</h1>
      <p className="text-gray-400">{text}</p>
    </div>
  )
}
