import { useState, useRef } from 'react'
import { useBet } from '../../context/BetContext'
import BetSlipItem from './BetSlipItem'
import { X, Trash2 } from 'lucide-react'

const BetSlip = () => {
  const {
    selections,
    stake,
    setStake,
    isOpen,
    closeBetSlip,
    removeSelection,
    clearSelections,
    getTotalOdds,
    getPotentialWinnings,
    placeBet,
  } = useBet()

  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState('')
  const [touchStartY, setTouchStartY] = useState(0)
  const slipRef = useRef(null)

  const totalOdds = getTotalOdds()
  const potentialWinnings = getPotentialWinnings()

  const handlePlaceBet = async () => {
    if (selections.length === 0) {
      setError('No selections added')
      return
    }
    if (stake <= 0) {
      setError('Please enter a valid stake')
      return
    }
    setIsPlacing(true)
    setError('')
    try {
      await placeBet()
      closeBetSlip()
    } catch (err) {
      setError(err.message || 'Failed to place bet')
    } finally {
      setIsPlacing(false)
    }
  }

  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e) => {
    const touchEndY = e.touches[0].clientY
    const diff = touchEndY - touchStartY
    if (diff > 50 && slipRef.current) {
      closeBetSlip()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={closeBetSlip} />
      
      <div 
        ref={slipRef}
        className="relative bg-card w-full max-w-md md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[80vh] flex flex-col shadow-2xl border border-white/10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>

        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Bet Slip</h3>
          <button onClick={closeBetSlip} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selections.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No selections added</p>
          ) : (
            <>
              {selections.map((sel, index) => (
                <BetSlipItem
                  key={`${sel.matchId}-${sel.market}-${index}`}
                  selection={sel}
                  onRemove={() => removeSelection(sel.matchId, sel.market)}
                />
              ))}
              <button
                onClick={clearSelections}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 size={14} /> Clear All
              </button>
            </>
          )}
        </div>

        {selections.length > 0 && (
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Odds</span>
              <span className="text-white font-bold">{totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Stake (GHS)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                className="w-32 bg-dark border border-white/10 rounded px-2 py-1 text-white text-right"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-gray-400">Potential Winnings</span>
              <span className="text-green-400">GHS {potentialWinnings.toFixed(2)}</span>
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button
              onClick={handlePlaceBet}
              disabled={isPlacing || selections.length === 0 || stake <= 0}
              className="w-full bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              {isPlacing ? 'Placing...' : 'Place Bet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BetSlip