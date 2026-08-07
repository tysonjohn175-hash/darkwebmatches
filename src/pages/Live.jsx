import { useState } from 'react'
import { useMatchEngine } from '../context/MatchEngineContext'
import MatchCard from '../components/common/MatchCard'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import EmptyState from '../components/common/EmptyState'

const Live = () => {
  const [loading, setLoading] = useState(false)
  const { customMatches } = useMatchEngine()

  const customToMatchCard = (match) => {
    const isLive = match.status === 'live'
    const oddsData = match.markets?.h2h || null

    return {
      fixture: {
        id: `custom_${match.id}`,
        status: {
          short: isLive ? 'LIVE' : 'NS',
          elapsed: match.elapsed || 0,
          long: isLive ? 'Live' : 'Not Started',
        },
        date: match.startTime,
        venue: {
          name: 'Custom Match',
          city: 'BetZone',
        },
      },
      teams: {
        home: {
          name: match.homeTeam,
          logo: null,
        },
        away: {
          name: match.awayTeam,
          logo: null,
        },
      },
      league: {
        name: match.league || 'Custom League',
        logo: null,
      },
      goals: {
        home: match.goals?.home || 0,
        away: match.goals?.away || 0,
      },
      odds: oddsData,
      isCustom: true,
      customMatch: match,
    }
  }

  const liveCustomMatches = customMatches
    .filter(m => m.status === 'live')
    .map(customToMatchCard)

  if (loading) {
    return (
      <div className="py-4">
        <h1 className="text-2xl font-bold text-white mb-4">Live Matches</h1>
        <LoadingSkeleton type="card" count={3} />
      </div>
    )
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold text-white mb-4">Live Matches</h1>
      <span className="text-xs text-gray-400">Only custom matches are shown</span>
      {liveCustomMatches.length === 0 ? (
        <div className="bg-card rounded-lg p-8 text-center border border-white/5 mt-4">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-bold text-white mb-2">No live matches</h3>
          <p className="text-gray-400">Check back later for live matches.</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {liveCustomMatches.map((match) => (
            <MatchCard
              key={match.fixture.id}
              match={match}
              isLive={true}
              showOdds={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Live