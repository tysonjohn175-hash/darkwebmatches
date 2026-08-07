import { useState } from 'react'
import { useMatchEngine } from '../../context/MatchEngineContext'
import { useNotification } from '../../context/NotificationContext'

const CustomMatchForm = () => {
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [league, setLeague] = useState('')
  const getDefaultStartTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    return now.toISOString().slice(0, 16)
  }
  const [startTime, setStartTime] = useState(getDefaultStartTime)
  const [finalHomeScore, setFinalHomeScore] = useState('')
  const [finalAwayScore, setFinalAwayScore] = useState('')
  const [homeGoalMinutes, setHomeGoalMinutes] = useState('')
  const [awayGoalMinutes, setAwayGoalMinutes] = useState('')
  const [oddsHome, setOddsHome] = useState('')
  const [oddsDraw, setOddsDraw] = useState('')
  const [oddsAway, setOddsAway] = useState('')
  const [overUnderOdds, setOverUnderOdds] = useState({})
  const [correctScores, setCorrectScores] = useState([
    { score: '1-0', odds: '' }, { score: '2-0', odds: '' }, { score: '2-1', odds: '' },
    { score: '3-0', odds: '' }, { score: '3-1', odds: '' }, { score: '3-2', odds: '' },
    { score: '0-0', odds: '' }, { score: '1-1', odds: '' }, { score: '2-2', odds: '' },
    { score: '0-1', odds: '' }, { score: '0-2', odds: '' }, { score: '1-2', odds: '' },
    { score: '0-3', odds: '' }, { score: '1-3', odds: '' }, { score: '2-3', odds: '' },
  ])
  const [customScore, setCustomScore] = useState({ home: '', away: '', odds: '' })
  const [htftOdds, setHtftOdds] = useState({
    'Home/Home': '', 'Home/Draw': '', 'Home/Away': '',
    'Draw/Home': '', 'Draw/Draw': '', 'Draw/Away': '',
    'Away/Home': '', 'Away/Draw': '', 'Away/Away': '',
  })
  const [error, setError] = useState('')
  const { addCustomMatch } = useMatchEngine()
  const { showNotification } = useNotification()

  const handleOverUnderChange = (line, type, value) => {
    setOverUnderOdds(prev => ({
      ...prev,
      [line]: { ...prev[line], [type]: value }
    }))
  }

  const handleCorrectScoreChange = (index, field, value) => {
    const updated = [...correctScores]
    updated[index][field] = value
    setCorrectScores(updated)
  }

  const addCustomCorrectScore = () => {
    if (!customScore.home || !customScore.away || !customScore.odds) return
    const newScore = `${customScore.home}-${customScore.away}`
    setCorrectScores([...correctScores, { score: newScore, odds: customScore.odds }])
    setCustomScore({ home: '', away: '', odds: '' })
  }

  const removeCorrectScore = (index) => {
    if (index < 15) return
    setCorrectScores(correctScores.filter((_, i) => i !== index))
  }

  const handleHtftChange = (key, value) => {
    setHtftOdds(prev => ({ ...prev, [key]: value }))
  }

  const parseMinutes = (str) => {
    if (!str) return []
    return str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n < 90)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!homeTeam || !awayTeam || !league || !startTime) {
      setError('All basic fields required')
      return
    }

    try {
      const result = await addCustomMatch({
        homeTeam,
        awayTeam,
        league,
        startTime,
        finalHomeScore: parseInt(finalHomeScore) || 0,
        finalAwayScore: parseInt(finalAwayScore) || 0,
        homeGoalMinutes: parseMinutes(homeGoalMinutes),
        awayGoalMinutes: parseMinutes(awayGoalMinutes),
        markets: {
          h2h: {
            home: parseFloat(oddsHome) || 2.00,
            draw: parseFloat(oddsDraw) || 3.50,
            away: parseFloat(oddsAway) || 3.00,
          },
          overUnder: Object.keys(overUnderOdds).reduce((acc, line) => {
            const val = overUnderOdds[line]
            if (val.over && val.under) {
              acc[line] = { over: parseFloat(val.over), under: parseFloat(val.under) }
            }
            return acc
          }, {}),
          correctScore: correctScores.reduce((acc, cs) => {
            if (cs.odds) acc[cs.score] = parseFloat(cs.odds)
            return acc
          }, {}),
          htft: Object.keys(htftOdds).reduce((acc, key) => {
            if (htftOdds[key]) acc[key] = parseFloat(htftOdds[key])
            return acc
          }, {}),
        },
      })

      showNotification(`✅ Match created! ${homeTeam} vs ${awayTeam} will start at ${new Date(startTime).toLocaleString()}`, 'success')

      // Reset form
      setHomeTeam('')
      setAwayTeam('')
      setLeague('')
      setStartTime(getDefaultStartTime())
      setFinalHomeScore('')
      setFinalAwayScore('')
      setHomeGoalMinutes('')
      setAwayGoalMinutes('')
      setOddsHome('')
      setOddsDraw('')
      setOddsAway('')
      setOverUnderOdds({})
      setCorrectScores([
        { score: '1-0', odds: '' }, { score: '2-0', odds: '' }, { score: '2-1', odds: '' },
        { score: '3-0', odds: '' }, { score: '3-1', odds: '' }, { score: '3-2', odds: '' },
        { score: '0-0', odds: '' }, { score: '1-1', odds: '' }, { score: '2-2', odds: '' },
        { score: '0-1', odds: '' }, { score: '0-2', odds: '' }, { score: '1-2', odds: '' },
        { score: '0-3', odds: '' }, { score: '1-3', odds: '' }, { score: '2-3', odds: '' },
      ])
      setCustomScore({ home: '', away: '', odds: '' })
      setHtftOdds({
        'Home/Home': '', 'Home/Draw': '', 'Home/Away': '',
        'Draw/Home': '', 'Draw/Draw': '', 'Draw/Away': '',
        'Away/Home': '', 'Away/Draw': '', 'Away/Away': '',
      })
      setError('')
    } catch (err) {
      console.error(err)
      showNotification('❌ Failed to create match: ' + err.message, 'error')
    }
  }

  return (
    <div className="bg-dark/50 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-3">Create Custom Match</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Home Team"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            placeholder="Away Team"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="League"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Final Home Score</label>
            <input
              type="number"
              min="0"
              step="1"
              value={finalHomeScore}
              onChange={(e) => setFinalHomeScore(e.target.value)}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
              placeholder="e.g. 3"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Final Away Score</label>
            <input
              type="number"
              min="0"
              step="1"
              value={finalAwayScore}
              onChange={(e) => setFinalAwayScore(e.target.value)}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
              placeholder="e.g. 1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Home Goal Minutes (optional)</label>
            <input
              type="text"
              value={homeGoalMinutes}
              onChange={(e) => setHomeGoalMinutes(e.target.value)}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
              placeholder="e.g. 12, 34, 67"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Away Goal Minutes (optional)</label>
            <input
              type="text"
              value={awayGoalMinutes}
              onChange={(e) => setAwayGoalMinutes(e.target.value)}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
              placeholder="e.g. 23, 45, 89"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">If left blank, goals will be generated randomly.</p>

        <div className="text-sm text-gray-400 font-medium">1X2 Odds</div>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            step="0.01"
            placeholder="Home Odds"
            value={oddsHome}
            onChange={(e) => setOddsHome(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Draw Odds"
            value={oddsDraw}
            onChange={(e) => setOddsDraw(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Away Odds"
            value={oddsAway}
            onChange={(e) => setOddsAway(e.target.value)}
            className="bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
        </div>

        <div className="text-sm text-gray-400 font-medium">Over / Under (0.5 - 5.5)</div>
        <div className="grid grid-cols-6 gap-2 text-xs">
          {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5].map((line) => (
            <div key={line} className="flex flex-col items-center bg-card p-1 rounded">
              <span className="text-gray-400">{line}</span>
              <input
                type="number"
                step="0.01"
                placeholder="O"
                className="w-full bg-dark border border-white/10 rounded px-1 py-0.5 text-white text-xs"
                value={overUnderOdds[line]?.over || ''}
                onChange={(e) => handleOverUnderChange(line, 'over', e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="U"
                className="w-full bg-dark border border-white/10 rounded px-1 py-0.5 text-white text-xs mt-0.5"
                value={overUnderOdds[line]?.under || ''}
                onChange={(e) => handleOverUnderChange(line, 'under', e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-400 font-medium">Correct Score</div>
        <div className="grid grid-cols-3 gap-2">
          {correctScores.map((cs, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-xs text-white w-12">{cs.score}</span>
              <input
                type="number"
                step="0.01"
                placeholder="Odds"
                className="flex-1 bg-dark border border-white/10 rounded px-1 py-0.5 text-white text-xs"
                value={cs.odds}
                onChange={(e) => handleCorrectScoreChange(idx, 'odds', e.target.value)}
              />
              {idx >= 15 && (
                <button
                  type="button"
                  onClick={() => removeCorrectScore(idx)}
                  className="text-red-400 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            placeholder="Home"
            className="w-16 bg-dark border border-white/10 rounded px-2 py-1 text-white text-sm"
            value={customScore.home}
            onChange={(e) => setCustomScore({ ...customScore, home: e.target.value })}
          />
          <span className="text-white">-</span>
          <input
            type="number"
            placeholder="Away"
            className="w-16 bg-dark border border-white/10 rounded px-2 py-1 text-white text-sm"
            value={customScore.away}
            onChange={(e) => setCustomScore({ ...customScore, away: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Odds"
            className="w-20 bg-dark border border-white/10 rounded px-2 py-1 text-white text-sm"
            value={customScore.odds}
            onChange={(e) => setCustomScore({ ...customScore, odds: e.target.value })}
          />
          <button
            type="button"
            onClick={addCustomCorrectScore}
            className="bg-primary text-white text-xs px-2 py-1 rounded"
          >
            Add
          </button>
        </div>

        <div className="text-sm text-gray-400 font-medium">Half Time / Full Time</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(htftOdds).map((key) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-xs text-white w-24">{key}</span>
              <input
                type="number"
                step="0.01"
                placeholder="Odds"
                className="flex-1 bg-dark border border-white/10 rounded px-1 py-0.5 text-white text-xs"
                value={htftOdds[key]}
                onChange={(e) => handleHtftChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
        >
          Create Match
        </button>
      </form>
    </div>
  )
}

export default CustomMatchForm