'use client'

import { getLevelFromXP, getLevelName, getLevelProgress, getXPForNextLevel } from '@/lib/gamification'

export default function LevelCard({ xp = 0 }) {
  const level = getLevelFromXP(xp)
  const levelName = getLevelName(level)
  const progress = getLevelProgress(xp)
  const nextLevelXP = getXPForNextLevel(level)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-widest">Level {level}</span>
          <p className="text-sm font-medium text-green-700 mt-0.5">{levelName}</p>
        </div>
        <span className="text-xs text-gray-400">{xp} / {nextLevelXP} XP</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">{nextLevelXP - xp} XP to {getLevelName(level + 1)}</p>
    </div>
  )
}
