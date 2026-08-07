import { useState, useEffect } from 'react'
import { useSupabase } from '../../context/SupabaseContext'
import { useBet } from '../../context/BetContext'
import { useMatchEngine } from '../../context/MatchEngineContext'

const AnalyticsDashboard = () => {
  const { getAllUsers } = useSupabase()
  const { bets = [] } = useBet()
  const { customMatches = [], matchHistory = [] } = useMatchEngine()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBets: 0,
    openBets: 0,
    wonBets: 0,
    lostBets: 0,
    totalVolume: 0,
    totalWinnings: 0,
    liveMatches: 0,
    upcomingMatches: 0,
    finishedMatches: 0,
    totalMatches: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const users = await getAllUsers()
        const openBets = bets.filter(b => b.status === 'open')
        const wonBets = bets.filter(b => b.status === 'won')
        const lostBets = bets.filter(b => b.status === 'lost')
        const totalVolume = bets.reduce((sum, b) => sum + (b.stake || 0), 0)
        const totalWinnings = bets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.potentialWin || 0), 0)

        const liveMatches = customMatches.filter(m => m.status === 'live').length
        const upcomingMatches = customMatches.filter(m => m.status === 'upcoming').length
        const finishedMatches = customMatches.filter(m => m.status === 'finished').length
        const totalMatches = customMatches.length + matchHistory.length

        setStats({
          totalUsers: users?.length || 0,
          activeUsers: users?.filter(u => u.active !== false).length || 0,
          totalBets: bets.length,
          openBets: openBets.length,
          wonBets: wonBets.length,
          lostBets: lostBets.length,
          totalVolume,
          totalWinnings,
          liveMatches,
          upcomingMatches,
          finishedMatches,
          totalMatches,
        })
      } catch (error) {
        console.error('Analytics error:', error)
      }
    }

    fetchStats()
  }, [bets, customMatches, matchHistory, getAllUsers])

  const StatCard = ({ title, value, color = 'text-primary', subtitle = '' }) => (
    <div className="bg-dark/50 rounded-lg p-4 border border-white/5">
      <div className="text-sm text-gray-400">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">Analytics Dashboard</h3>

      {/* User Stats */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Users</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Users" value={stats.totalUsers} color="text-blue-400" />
          <StatCard title="Active Users" value={stats.activeUsers} color="text-green-400" />
          <StatCard title="Inactive" value={stats.totalUsers - stats.activeUsers} color="text-gray-400" />
        </div>
      </div>

      {/* Bet Stats */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Bets</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Bets" value={stats.totalBets} color="text-white" />
          <StatCard title="Open" value={stats.openBets} color="text-yellow-400" />
          <StatCard title="Won" value={stats.wonBets} color="text-green-400" />
          <StatCard title="Lost" value={stats.lostBets} color="text-red-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          <StatCard title="Total Volume" value={`GHS ${stats.totalVolume.toFixed(2)}`} color="text-blue-400" />
          <StatCard title="Total Winnings" value={`GHS ${stats.totalWinnings.toFixed(2)}`} color="text-green-400" />
        </div>
      </div>

      {/* Match Stats */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Custom Matches</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total" value={stats.totalMatches} color="text-white" />
          <StatCard title="Live" value={stats.liveMatches} color="text-red-400" />
          <StatCard title="Upcoming" value={stats.upcomingMatches} color="text-blue-400" />
          <StatCard title="Finished" value={stats.finishedMatches} color="text-gray-400" />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="text-sm text-gray-400">Platform Summary</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div>
            <div className="text-xs text-gray-500">Users</div>
            <div className="text-lg font-bold text-white">{stats.totalUsers}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Bets</div>
            <div className="text-lg font-bold text-white">{stats.totalBets}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Volume</div>
            <div className="text-lg font-bold text-green-400">GHS {stats.totalVolume.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Win Rate</div>
            <div className="text-lg font-bold text-yellow-400">
              {stats.totalBets > 0 ? ((stats.wonBets / stats.totalBets) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard