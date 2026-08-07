import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useBet } from './BetContext'

const MatchEngineContext = createContext()

export const MatchEngineProvider = ({ children }) => {
  const [customMatches, setCustomMatches] = useState(() => {
    const saved = localStorage.getItem('betzone_custom_matches')
    return saved ? JSON.parse(saved) : []
  })
  const [matchHistory, setMatchHistory] = useState(() => {
    const saved = localStorage.getItem('betzone_match_history')
    return saved ? JSON.parse(saved) : []
  })

  const { settleBetsForMatch } = useBet()
  const intervalRef = useRef(null)
  const processingRef = useRef(false)

  // ----- Helper: Update odds based on score & time -----
  const updateOddsAfterGoal = (match) => {
    if (!match.markets?.h2h) return match

    const odds = match.markets.h2h
    if (!odds.home || !odds.draw || !odds.away) return match

    const homeProb = 1 / odds.home
    const drawProb = 1 / odds.draw
    const awayProb = 1 / odds.away
    const totalProb = homeProb + drawProb + awayProb

    // Normalize to sum=1
    let finalHomeProb = homeProb / totalProb
    let finalDrawProb = drawProb / totalProb
    let finalAwayProb = awayProb / totalProb

    const scoreDiff = match.goals.home - match.goals.away
    const elapsed = match.elapsed || 0
    const timeFactor = Math.min(elapsed / 90, 1) // 0..1

    // 1. Score difference effect
    if (scoreDiff > 0) {
      // Home leads – increase home probability
      const boost = 0.08 * (1 + timeFactor) * Math.min(scoreDiff, 3)
      finalHomeProb = Math.min(finalHomeProb + boost, 0.9)
      // Reduce away and draw proportionally
      const reduce = boost / 2
      finalAwayProb = Math.max(finalAwayProb - reduce, 0.01)
      finalDrawProb = Math.max(finalDrawProb - reduce, 0.01)
    } else if (scoreDiff < 0) {
      // Away leads
      const boost = 0.08 * (1 + timeFactor) * Math.min(Math.abs(scoreDiff), 3)
      finalAwayProb = Math.min(finalAwayProb + boost, 0.9)
      const reduce = boost / 2
      finalHomeProb = Math.max(finalHomeProb - reduce, 0.01)
      finalDrawProb = Math.max(finalDrawProb - reduce, 0.01)
    } else {
      // Draw – draw probability increases as time passes
      if (timeFactor > 0.6) {
        const boost = 0.1 * (timeFactor - 0.6) / 0.4
        finalDrawProb = Math.min(finalDrawProb + boost, 0.5)
        const reduce = boost / 2
        finalHomeProb = Math.max(finalHomeProb - reduce, 0.01)
        finalAwayProb = Math.max(finalAwayProb - reduce, 0.01)
      }
    }

    // 2. Time effect: as match nears end, draw probability drops slightly (if not draw)
    if (timeFactor > 0.8 && scoreDiff !== 0) {
      const reduce = 0.05 * (timeFactor - 0.8) / 0.2
      finalDrawProb = Math.max(finalDrawProb - reduce, 0.01)
      // Add to leading team
      if (scoreDiff > 0) {
        finalHomeProb += reduce
      } else {
        finalAwayProb += reduce
      }
    }

    // Normalize to sum = 1
    const newTotal = finalHomeProb + finalDrawProb + finalAwayProb
    if (newTotal === 0) return match

    const newHome = (1 / (finalHomeProb / newTotal))
    const newDraw = (1 / (finalDrawProb / newTotal))
    const newAway = (1 / (finalAwayProb / newTotal))

    // Clamp odds to reasonable range
    const clamp = (v) => Math.min(Math.max(v, 1.01), 20)

    match.markets.h2h = {
      home: clamp(newHome),
      draw: clamp(newDraw),
      away: clamp(newAway),
    }

    return match
  }

  // ----- Other helper functions -----
  const generateGoalMinutes = (count) => {
    if (count === 0) return []
    const minutes = new Set()
    while (minutes.size < count) {
      const minute = Math.floor(Math.random() * 89) + 1
      minutes.add(minute)
    }
    return Array.from(minutes).sort((a, b) => a - b)
  }

  const addCustomMatch = (match) => {
    const finalHome = match.finalHomeScore || 0
    const finalAway = match.finalAwayScore || 0

    const homeGoals = finalHome > 0 ? finalHome : Math.floor(Math.random() * 6)
    const awayGoals = finalAway > 0 ? finalAway : Math.floor(Math.random() * 6)

    const homeMinutes = match.homeGoalMinutes?.length > 0
      ? match.homeGoalMinutes
      : generateGoalMinutes(homeGoals)

    const awayMinutes = match.awayGoalMinutes?.length > 0
      ? match.awayGoalMinutes
      : generateGoalMinutes(awayGoals)

    const newMatch = {
      ...match,
      id: Date.now(),
      status: 'upcoming',
      goals: { home: 0, away: 0 },
      elapsedSeconds: 0,
      events: [],
      goalTimeline: [],
      createdAt: new Date().toISOString(),
      markets: match.markets || {},
      goalSchedule: { home: homeMinutes, away: awayMinutes },
      finalHomeScore: homeGoals,
      finalAwayScore: awayGoals,
      halftimeScore: null,
    }
    setCustomMatches(prev => [...prev, newMatch])
    return newMatch
  }

  const updateMatch = (id, updates) => {
    setCustomMatches(prev =>
      prev.map(m => m.id === id ? { ...m, ...updates } : m)
    )
  }

  const deleteMatch = (id) => {
    setCustomMatches(prev => prev.filter(m => m.id !== id))
  }

  const archiveMatch = (id) => {
    const match = customMatches.find(m => m.id === id)
    if (match) {
      const archived = {
        ...match,
        archivedAt: new Date().toISOString(),
        status: 'archived',
      }
      setMatchHistory(prev => [...prev, archived])
      deleteMatch(id)
    }
  }

  // ----- Main simulation effect (runs every second) -----
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (processingRef.current) return
      processingRef.current = true

      const now = new Date()
      let updatedMatches = [...customMatches]
      let changesMade = false
      let matchesToSettle = []
      let matchesToArchive = []

      updatedMatches = updatedMatches.map(m => {
        // Auto‑start is handled by Vercel cron – we keep the frontend timer for live simulation
        // (cron sets status to 'live', so this block is redundant but safe)
        // We'll keep it to handle edge cases.

        if (m.status === 'live') {
          let newGoals = { ...m.goals }
          let events = [...(m.events || [])]
          let goalTimeline = [...(m.goalTimeline || [])]
          let newElapsedSeconds = (m.elapsedSeconds || 0) + 1

          const schedule = m.goalSchedule || { home: [], away: [] }
          const homeMinutes = schedule.home || []
          const awayMinutes = schedule.away || []
          const currentMinute = Math.floor(newElapsedSeconds / 60)
          const prevMinute = Math.floor((newElapsedSeconds - 1) / 60)

          let goalScored = false

          if (currentMinute !== prevMinute) {
            if (homeMinutes.includes(currentMinute)) {
              newGoals.home += 1
              events.push({ minute: currentMinute, team: 'home', type: 'goal' })
              goalTimeline.push({ minute: currentMinute, team: 'home', score: { ...newGoals } })
              goalScored = true
            }
            if (awayMinutes.includes(currentMinute)) {
              newGoals.away += 1
              events.push({ minute: currentMinute, team: 'away', type: 'goal' })
              goalTimeline.push({ minute: currentMinute, team: 'away', score: { ...newGoals } })
              goalScored = true
            }
          }

          // If a goal was scored, update odds dynamically
          if (goalScored) {
            // Update the match's odds based on new score and elapsed time
            const updatedMatch = updateOddsAfterGoal({
              ...m,
              goals: newGoals,
              elapsed: newElapsedSeconds, // we use elapsedSeconds for time factor
            })
            // Merge back the updated odds
            m.markets = updatedMatch.markets
          }

          let halftimeScore = m.halftimeScore
          if (newElapsedSeconds === 2700) {
            halftimeScore = { home: newGoals.home, away: newGoals.away }
          }

          let status = 'LIVE'
          if (newElapsedSeconds === 2700) {
            status = 'HT'
          }

          if (newElapsedSeconds >= 5400) {
            changesMade = true
            const result = {
              homeScore: newGoals.home,
              awayScore: newGoals.away,
              homeName: m.homeTeam,
              awayName: m.awayTeam,
              halftimeHome: halftimeScore?.home ?? 0,
              halftimeAway: halftimeScore?.away ?? 0,
            }
            matchesToSettle.push({ matchId: m.id, result })
            return {
              ...m,
              goals: newGoals,
              elapsedSeconds: 5400,
              status: 'finished',
              events,
              goalTimeline,
              finishedAt: new Date().toISOString(),
              result,
              halftimeScore,
            }
          }

          if (newGoals.home !== m.goals.home || newGoals.away !== m.goals.away || newElapsedSeconds !== m.elapsedSeconds) {
            changesMade = true
          }

          return {
            ...m,
            goals: newGoals,
            elapsedSeconds: newElapsedSeconds,
            events,
            goalTimeline,
            halftimeScore,
          }
        }
        return m
      })

      // Archive finished matches after 10 seconds
      const nowTime = now.getTime()
      const kept = []
      const toArchive = []
      updatedMatches.forEach(m => {
        if (m.status === 'finished' && m.finishedAt) {
          const finishedTime = new Date(m.finishedAt).getTime()
          if (nowTime - finishedTime > 10000) {
            toArchive.push(m)
          } else {
            kept.push(m)
          }
        } else {
          kept.push(m)
        }
      })

      if (toArchive.length > 0) {
        changesMade = true
        setMatchHistory(prev => [...prev, ...toArchive.map(m => ({ ...m, archivedAt: new Date().toISOString() }))])
      }

      if (matchesToSettle.length > 0) {
        setTimeout(() => {
          matchesToSettle.forEach(({ matchId, result }) => {
            settleBetsForMatch(`custom_${matchId}`, result)
          })
        }, 100)
      }

      if (changesMade) {
        setCustomMatches(kept)
      } else if (toArchive.length > 0) {
        setCustomMatches(kept)
      }

      processingRef.current = false
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [customMatches, settleBetsForMatch])

  return (
    <MatchEngineContext.Provider
      value={{
        customMatches,
        matchHistory,
        addCustomMatch,
        updateMatch,
        deleteMatch,
        archiveMatch,
      }}
    >
      {children}
    </MatchEngineContext.Provider>
  )
}

export const useMatchEngine = () => {
  const context = useContext(MatchEngineContext)
  if (!context) throw new Error('useMatchEngine must be used within a MatchEngineProvider')
  return context
}