import React from 'react'
import { Link } from 'react-router-dom'
import { useBet } from '../../context/BetContext'

const MatchCard = ({ match, isLive = false, showOdds = true }) => {
  const { addSelection } = useBet()
  if (!match) return null

  const homeTeam = match.teams?.home?.name || 'TBD'
  const awayTeam = match.teams?.away?.name || 'TBD'
  const homeLogo = match.teams?.home?.logo
  const awayLogo = match.teams?.away?.logo
  const leagueName = match.league?.name || 'Unknown League'
  const leagueLogo = match.league?.logo
  const homeScore = match.goals?.home ?? '-'
  const awayScore = match.goals?.away ?? '-'
  const elapsed = match.fixture?.status?.elapsed || 0
  const status = match.fixture?.status?.short || 'NS'
  const matchTime = match.fixture?.date ? new Date(match.fixture.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''

  const isLiveMatch = isLive || ['LIVE', '1H', '2H', 'HT'].includes(status)
  const isHalfTime = status === 'HT' || (isLiveMatch && elapsed >= 45 && elapsed < 46)

  const oddsData = match.odds || null

  const handleAddBet = (market, oddsValue, label, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!oddsValue) return
    addSelection(match.fixture.id, market, oddsValue, label)
  }

  const OddsButton = ({ label, oddsValue, market }) => {
    if (!oddsValue) return null
    return (
      <button
        onClick={(e) => handleAddBet(market, oddsValue, label, e)}
        className="bg-primary/20 hover:bg-primary text-white px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1"
      >
        <span className="text-white/70">{label}</span>
        <span className="text-yellow-300">{oddsValue.toFixed(2)}</span>
      </button>
    )
  }

  const hasOdds = oddsData && (oddsData.h2h || oddsData.overUnder)

  return (
    <Link to={`/match/${match.fixture.id}`} className="block">
      <div className={`bg-card rounded-lg p-3 border transition ${isLiveMatch ? 'border-primary/40 hover:border-primary/60' : 'border-white/5 hover:border-primary/30'}`}>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          {leagueLogo && <img src={leagueLogo} alt={leagueName} loading="lazy" className="w-4 h-4 object-contain" />}
          <span>{leagueName}</span>
          {match.isCustom && <span className="text-xs text-yellow-400 ml-1">⭐ Custom</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {homeLogo && <img src={homeLogo} alt={homeTeam} loading="lazy" className="w-6 h-6 object-contain" />}
            <span className="font-medium text-sm">{homeTeam}</span>
          </div>
          <div className="text-center">
            {isLiveMatch ? (
              isHalfTime ? (
                <div className="text-sm font-bold text-yellow-400">HT</div>
              ) : (
                <>
                  <span className="text-red-500 text-sm font-bold animate-pulse">●</span>
                  <span className="text-xs text-gray-400 ml-1">{elapsed}'</span>
                  <div className="text-lg font-bold">{homeScore} : {awayScore}</div>
                </>
              )
            ) : (
              <span className="text-sm text-gray-400">{matchTime}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{awayTeam}</span>
            {awayLogo && <img src={awayLogo} alt={awayTeam} loading="lazy" className="w-6 h-6 object-contain" />}
          </div>
        </div>
        {showOdds && (
          <div className="mt-2 flex flex-wrap gap-1 justify-end">
            {hasOdds ? (
              <>
                {oddsData.h2h && (
                  <>
                    <OddsButton label="1" oddsValue={oddsData.h2h.home} market="1X2_home" />
                    <OddsButton label="X" oddsValue={oddsData.h2h.draw} market="1X2_draw" />
                    <OddsButton label="2" oddsValue={oddsData.h2h.away} market="1X2_away" />
                  </>
                )}
                {oddsData.overUnder && (
                  <OddsButton label="O/U" oddsValue={oddsData.overUnder.over} market="over" />
                )}
              </>
            ) : (
              <span className="text-xs text-gray-500">Odds unavailable</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

export default MatchCard