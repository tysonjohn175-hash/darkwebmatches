import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useBet } from './BetContext'
import supabase from '../lib/supabase'

const MatchEngineContext = createContext()

export const MatchEngineProvider = ({ children }) => {
  const [customMatches, setCustomMatches] = useState([])
  const [matchHistory, setMatchHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { settleBetsForMatch } = useBet()
  const intervalRef = useRef(null)
  const processingRef = useRef(false)

  // ----- Load matches from Supabase on mount -----
  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_matches')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Separate upcoming/live from finished
      const active = data.filter(m => m.status !== 'finished' && m.status !== 'archived')
      const history = data.filter(m => m.status === 'finished' || m.status === 'archived')

      setCustomMatches(active)
      setMatchHistory(history)
    } catch (error) {
      console.error('Failed to load matches:', error)
      // Fallback to localStorage if available
      const saved = localStorage.getItem('betzone_custom_matches')
      if (saved) setCustomMatches(JSON.parse(saved))
      const savedHistory = localStorage.getItem('betzone_match_history')
      if (savedHistory) setMatchHistory(JSON.parse(savedHistory))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatches()
  }, [])

  // ----- Add a new custom match (admin only) -----
  const addCustomMatch = async (match) => {
    const finalHome = match.finalHomeScore || 0
    const finalAway = match.finalAwayScore || 0

    const homeGoals = finalHome > 0 ? finalHome : Math.floor(Math.random() * 6)
    const awayGoals = finalAway > 0 ? finalAway : Math.floor(Math.random() * 6)

    const generateGoalMinutes = (count) => {
      if (count === 0) return []
      const minutes = new Set()
      while (minutes.size < count) {
        const minute = Math.floor(Math.random() * 89) + 1
        minutes.add(minute)
      }
      return Array.from(minutes).sort((a, b) => a - b)
    }

    const homeMinutes = match.homeGoalMinutes?.length > 0
      ? match.homeGoalMinutes
      : generateGoalMinutes(homeGoals)

    const awayMinutes = match.awayGoalMinutes?.length > 0
      ? match.awayGoalMinutes
      : generateGoalMinutes(awayGoals)

    const newMatch = {
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      league: match.league || 'Custom League',
      start_time: match.startTime,
      status: 'upcoming',
      goals_home: 0,
      goals_away: 0,
      elapsed_seconds: 0,
      events: [],
      goal_timeline: [],
      goal_schedule: { home: homeMinutes, away: awayMinutes },
      final_home_score: homeGoals,
      final_away_score: awayGoals,
      halftime_score: null,
      markets: match.markets || {},
    }

    const { data, error } = await supabase
      .from('custom_matches')
      .insert(newMatch)
      .select()
      .single()

    if (error) throw error

    // Convert to frontend format
    const formatted = formatMatch(data)
    setCustomMatches(prev => [formatted, ...prev])
    return formatted
  }

  // ----- Update a match (admin) -----
  const updateMatch = async (id, updates) => {
    const { data, error } = await supabase
      .from('custom_matches')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update local state
    const formatted = formatMatch(data)
    setCustomMatches(prev =>
      prev.map(m => m.id === id ? formatted : m)
    )
    return formatted
  }

  // ----- Delete a match (admin) -----
  const deleteMatch = async (id) => {
    const { error } = await supabase
      .from('custom_matches')
      .delete()
      .eq('id', id)

    if (error) throw error

    setCustomMatches(prev => prev.filter(m => m.id !== id))
  }

  // ----- Archive a match (move to history) -----
  const archiveMatch = async (id) => {
    const match = customMatches.find(m => m.id === id)
    if (!match) return

    const { data, error } = await supabase
      .from('custom_matches')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const formatted = formatMatch(data)
    setCustomMatches(prev => prev.filter(m => m.id !== id))
    setMatchHistory(prev => [formatted, ...prev])
  }

  // ----- Helper: format DB match to frontend object -----
  const formatMatch = (db) => ({
    id: db.id,
    homeTeam: db.home_team,
    awayTeam: db.away_team,
    league: db.league,
    startTime: db.start_time,
    status: db.status,
    goals: { home: db.goals_home, away: db.goals_away },
    elapsedSeconds: db.elapsed_seconds || 0,
    events: db.events || [],
    goalTimeline: db.goal_timeline || [],
    goalSchedule: db.goal_schedule || { home: [], away: [] },
    finalHomeScore: db.final_home_score,
    finalAwayScore: db.final_away_score,
    halftimeScore: db.halftime_score,
    markets: db.markets || {},
    result: db.result,
    finishedAt: db.finished_at,
    createdAt: db.created_at,
  })

  // ----- Simulation effect (runs every second) -----
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      if (processingRef.current) return
      processingRef.current = true

      const now = new Date()
      let changesMade = false
      let matchesToSettle = []

      // Get current matches from Supabase (we only update those that are live)
      const { data: liveMatches, error } = await supabase
        .from('custom_matches')
        .select('*')
        .in('status', ['live', 'upcoming'])

      if (error) {
        console.error('Simulation error:', error)
        processingRef.current = false
        return
      }

      if (!liveMatches || liveMatches.length === 0) {
        processingRef.current = false
        return
      }

      for (const dbMatch of liveMatches) {
        let updated = { ...dbMatch }
        let needsUpdate = false

        // Auto-start if upcoming and time passed
        if (dbMatch.status === 'upcoming' && new Date(dbMatch.start_time) <= now) {
          updated.status = 'live'
          updated.elapsed_seconds = 0
          needsUpdate = true
        }

        if (updated.status === 'live') {
          let goalsHome = updated.goals_home
          let goalsAway = updated.goals_away
          let elapsed = (updated.elapsed_seconds || 0) + 1
          let events = updated.events || []
          let goalTimeline = updated.goal_timeline || []

          const schedule = updated.goal_schedule || { home: [], away: [] }
          const homeMinutes = schedule.home || []
          const awayMinutes = schedule.away || []
          const currentMinute = Math.floor(elapsed / 60)
          const prevMinute = Math.floor((elapsed - 1) / 60)

          let goalScored = false

          if (currentMinute !== prevMinute) {
            if (homeMinutes.includes(currentMinute)) {
              goalsHome += 1
              events.push({ minute: currentMinute, team: 'home', type: 'goal' })
              goalTimeline.push({ minute: currentMinute, team: 'home', score: { home: goalsHome, away: goalsAway } })
              goalScored = true
            }
            if (awayMinutes.includes(currentMinute)) {
              goalsAway += 1
              events.push({ minute: currentMinute, team: 'away', type: 'goal' })
              goalTimeline.push({ minute: currentMinute, team: 'away', score: { home: goalsHome, away: goalsAway } })
              goalScored = true
            }
          }

          // Update odds if goal scored
          if (goalScored) {
            // We'll update odds locally and then save to DB
            // For simplicity, we'll just update the match object
          }

          let halftimeScore = updated.halftime_score
          if (elapsed === 2700) {
            halftimeScore = { home: goalsHome, away: goalsAway }
          }

          let status = 'LIVE'
          if (elapsed === 2700) status = 'HT'

          if (elapsed >= 5400) {
            // Match finished
            const result = {
              homeScore: goalsHome,
              awayScore: goalsAway,
              homeName: updated.home_team,
              awayName: updated.away_team,
              halftimeHome: halftimeScore?.home ?? 0,
              halftimeAway: halftimeScore?.away ?? 0,
            }
            matchesToSettle.push({ matchId: updated.id, result })

            updated.status = 'finished'
            updated.finished_at = new Date().toISOString()
            updated.goals_home = goalsHome
            updated.goals_away = goalsAway
            updated.elapsed_seconds = 5400
            updated.events = events
            updated.goal_timeline = goalTimeline
            updated.halftime_score = halftimeScore
            updated.result = result
            needsUpdate = true
          } else {
            updated.goals_home = goalsHome
            updated.goals_away = goalsAway
            updated.elapsed_seconds = elapsed
            updated.events = events
            updated.goal_timeline = goalTimeline
            updated.halftime_score = halftimeScore
            needsUpdate = true
          }

          if (needsUpdate) {
            // Update in Supabase
            const { error: updateError } = await supabase
              .from('custom_matches')
              .update(updated)
              .eq('id', updated.id)

            if (updateError) console.error('Update error:', updateError)
          }
        }
      }

      // Settle bets (if any matches finished)
      if (matchesToSettle.length > 0) {
        setTimeout(() => {
          matchesToSettle.forEach(({ matchId, result }) => {
            settleBetsForMatch(`custom_${matchId}`, result)
          })
        }, 100)
      }

      // Refresh local state after updates
      await loadMatches()

      processingRef.current = false
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [settleBetsForMatch])

  // ----- Expose context value -----
  const value = {
    customMatches,
    matchHistory,
    loading,
    addCustomMatch,
    updateMatch,
    deleteMatch,
    archiveMatch,
  }

  return (
    <MatchEngineContext.Provider value={value}>
      {children}
    </MatchEngineContext.Provider>
  )
}

export const useMatchEngine = () => {
  const context = useContext(MatchEngineContext)
  if (!context) throw new Error('useMatchEngine must be used within a MatchEngineProvider')
  return context
}