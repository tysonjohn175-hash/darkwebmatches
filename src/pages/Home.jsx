import { useState, useEffect } from 'react'
import { useMatchEngine } from '../context/MatchEngineContext'
import { useSupabase } from '../context/SupabaseContext'
import MatchCard from '../components/common/MatchCard'
import Hero from '../components/home/Hero'
import HeroCarousel from '../components/home/HeroCarousel'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { Search, X, CalendarDays } from 'lucide-react'

const Home = () => {
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { customMatches, loading: matchLoading } = useMatchEngine()
  const { user } = useSupabase()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    setLoading(false)
  }, [])

  const customToMatchCard = (match) => {
    const isLive = match.status === 'live'
    const isUpcoming = match.status === 'upcoming'
    const oddsData = match.markets?.h2h || null

    return {
      fixture: {
        id: `custom_${match.id}`,
        status: {
          short: isLive ? 'LIVE' : isUpcoming ? 'NS' : 'FT',
          elapsed: match.elapsedSeconds || 0,
          long: isLive ? 'Live' : isUpcoming ? 'Not Started' : 'Finished',
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

  const customLive = customMatches.filter(m => m.status === 'live').map(customToMatchCard)
  const customUpcoming = customMatches.filter(m => m.status === 'upcoming').map(customToMatchCard)

  const allLive = customLive
  const allUpcoming = customUpcoming

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const getFilteredCustomMatches = () => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase().trim()
    return customMatches.filter(m => {
      const home = (m.homeTeam || '').toLowerCase()
      const away = (m.awayTeam || '').toLowerCase()
      const league = (m.league || '').toLowerCase()
      return home.includes(query) || away.includes(query) || league.includes(query)
    }).map(customToMatchCard)
  }

  const filteredMatches = getFilteredCustomMatches()
  const isSearching = searchQuery.trim().length > 0

  if (loading || matchLoading) {
    return (
      <div className="space-y-4 pb-4">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl h-48 animate-pulse" />
        <LoadingSkeleton type="card" count={3} />
      </div>
    )
  }

  if (isSearching) {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-2 bg-card rounded-lg p-2 border border-white/5">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search custom matches (team or league)..."
            className="flex-1 bg-transparent text-white outline-none placeholder:text-gray-500"
            autoFocus
          />
          {searchQuery && (
            <button onClick={clearSearch} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        <h2 className="text-xl font-bold text-white">Search Results</h2>
        {filteredMatches.length === 0 ? (
          <div className="bg-card rounded-lg p-8 text-center border border-white/5">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-400">No custom matches found for "{searchQuery}"</p>
            <p className="text-xs text-gray-500 mt-1">Try a different team or league</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.fixture.id}
                match={match}
                isLive={match.customMatch?.status === 'live'}
                showOdds={true}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ✅ Carousel appears when there are 2 or more upcoming matches
  const showCarousel = user && allUpcoming.length >= 2
  const showLive = allLive.length > 0
  const noMatchesMessage = user && !showCarousel && !showLive && allUpcoming.length === 0

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-2 bg-card rounded-lg p-2 border border-white/5">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search custom matches..."
          className="flex-1 bg-transparent text-white outline-none placeholder:text-gray-500"
        />
        {searchQuery && (
          <button onClick={clearSearch} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {noMatchesMessage ? (
        <div className="bg-card rounded-2xl p-12 text-center border border-white/5 shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CalendarDays size={40} className="text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No fixed games today</h2>
          <p className="text-gray-400 text-lg">Come back later for new matches</p>
          {isAdmin && (
            <div className="mt-6">
              <a
                href="/admin"
                className="inline-block bg-primary hover:bg-primary/80 text-white font-medium px-6 py-2 rounded-lg transition"
              >
                + Create Match
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {showCarousel ? (
            <HeroCarousel matches={allUpcoming} />
          ) : (
            // ✅ If only 1 upcoming match, show hero instead
            <Hero />
          )}

          {showLive && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-white">🔥 Live Now</h2>
                <a href="/live" className="text-primary text-sm font-medium">View All</a>
              </div>
              <div className="space-y-3">
                {allLive.map((match) => (
                  <MatchCard
                    key={match.fixture.id}
                    match={match}
                    isLive={true}
                    showOdds={true}
                  />
                ))}
              </div>
            </section>
          )}

          {!showCarousel && allUpcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">📅 Upcoming Matches</h2>
              <div className="space-y-3">
                {allUpcoming.map((match) => (
                  <MatchCard
                    key={match.fixture.id}
                    match={match}
                    isLive={false}
                    showOdds={true}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default Home