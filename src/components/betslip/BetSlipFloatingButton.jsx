import { useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useBet } from '../../context/BetContext'

const BetSlipFloatingButton = () => {
  const { selections, openBetSlip } = useBet()
  const location = useLocation()
  const count = selections.length

  // ✅ Show on homepage AND match details page
  if (location.pathname !== '/' && !location.pathname.startsWith('/match/')) return null

  // Position state (default bottom-right)
  const [position, setPosition] = useState(() => {
    const x = window.innerWidth - 80
    const y = window.innerHeight - 120
    return { x, y }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    const rect = dragRef.current.getBoundingClientRect()
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const btnSize = 60
    const maxX = window.innerWidth - btnSize
    const maxY = window.innerHeight - btnSize
    const newX = e.clientX - offsetRef.current.x
    const newY = e.clientY - offsetRef.current.y
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    const rect = dragRef.current.getBoundingClientRect()
    offsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
    setIsDragging(true)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const touch = e.touches[0]
    const btnSize = 60
    const maxX = window.innerWidth - btnSize
    const maxY = window.innerHeight - btnSize
    const newX = touch.clientX - offsetRef.current.x
    const newY = touch.clientY - offsetRef.current.y
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }

  const handleClick = (e) => {
    if (isDragging) return
    openBetSlip()
  }

  return (
    <button
      ref={dragRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="fixed z-50 bg-primary text-white rounded-full shadow-lg flex items-center justify-center transition hover:bg-secondary touch-none select-none"
      style={{
        left: position.x,
        top: position.y,
        width: '60px',
        height: '60px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <span className="text-xl font-bold">{count}</span>
    </button>
  )
}

export default BetSlipFloatingButton