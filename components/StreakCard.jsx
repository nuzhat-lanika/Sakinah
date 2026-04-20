'use client'

export default function StreakCard({ currentStreak = 0, longestStreak = 0, xp = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
        <div className="text-2xl font-semibold text-green-700">{currentStreak}</div>
        <div className="text-xs text-gray-400 mt-1">Day Streak</div>
      </div>
      <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
        <div className="text-2xl font-semibold text-amber-500">{longestStreak}</div>
        <div className="text-xs text-gray-400 mt-1">Best Streak</div>
      </div>
      <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
        <div className="text-2xl font-semibold text-green-700">{xp}</div>
        <div className="text-xs text-gray-400 mt-1">Total XP</div>
      </div>
    </div>
  )
}
