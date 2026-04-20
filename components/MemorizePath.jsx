'use client'

import { useState } from 'react'
import { BookOpen, Trophy, Lock, Star, ChevronRight, Zap } from 'lucide-react'
import useMasteryStore from '@/context/masteryStore'
import { MAP_NODES, SURAH_NAMES, SURAH_VERSE_COUNTS } from '@/lib/memorizeMap'

function NodeTooltip({ node, onStart, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl p-5 w-full max-w-sm animate-slide-up border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {node.type === 'REVIEW' ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Trophy size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Review Session</p>
                <p className="text-xs text-gray-400">Mixed from previous surahs</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              A randomized review of surahs you've started memorizing. Reinforces long-term retention.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <BookOpen size={20} className="text-green-700" />
              </div>
              <div>
                <p className="font-bold text-gray-800">{node.surahName}</p>
                <p className="text-xs text-gray-400">
                  Verses {node.chunk?.startAyah}–{node.chunk?.endAyah} · {node.chunk?.ayahCount} ayat
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">3x3 Memorization Method</p>
            <p className="text-xs text-gray-400 mb-4">Initial soak (7×) → Chain repetitions (3×) → Blind recitation test</p>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">Reward: +{node.xpReward} XP</span>
            </div>
          </>
        )}
        <button
          onClick={onStart}
          className="w-full py-3 rounded-2xl text-white font-bold text-sm"
          style={{ background: '#58CC02', boxShadow: '0 4px 0 #45a800' }}
        >
          Start →
        </button>
        <button onClick={onClose} className="w-full py-2 mt-2 text-gray-400 text-sm hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  )
}

function MapNode({ node, index, status, onClick }) {
  // Zig-zag snake offset
  const xOffset = Math.sin(index * 1.2) * 40

  const isLocked = status === 'locked'
  const isMastered = status === 'mastered'
  const isReview = node.type === 'REVIEW'
  const isCurrent = status === 'current'

  let bg = 'bg-gray-200 border-gray-300'
  let shadow = ''
  let icon = <Lock size={22} className="text-gray-400" />

  if (isReview && !isLocked) {
    bg = isMastered ? 'bg-amber-300 border-amber-500' : 'bg-amber-400 border-amber-600'
    shadow = 'shadow-amber-200'
    icon = <Trophy size={22} className="text-white" />
  } else if (!isLocked) {
    bg = isMastered ? 'bg-green-400 border-green-600' : 'bg-green-500 border-green-700'
    shadow = 'shadow-green-200'
    icon = isMastered
      ? <Star size={22} className="text-white fill-white" />
      : <BookOpen size={22} className="text-white" />
  }

  return (
    <div
      className="flex flex-col items-center mb-12 relative"
      style={{ transform: `translateX(${xOffset}px)` }}
    >
      {/* Current indicator pulse */}
      {isCurrent && (
        <div className="absolute -top-2 -left-2 -right-2 -bottom-2 rounded-full bg-green-400 opacity-30 animate-ping" />
      )}

      <button
        onClick={onClick}
        disabled={isLocked}
        className={`w-20 h-20 rounded-full shadow-lg flex items-center justify-center border-b-4 transition-all active:scale-95 disabled:cursor-not-allowed ${bg} ${shadow} relative`}
      >
        {icon}
        {isMastered && isReview && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <Star size={10} className="text-white fill-white" />
          </div>
        )}
      </button>

      {/* Label */}
      <div className="mt-3 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 whitespace-nowrap">
        <span className="text-xs font-bold text-gray-600">
          {node.type === 'REVIEW'
            ? '⭐ Review'
            : node.chunk
            ? `${node.surahName} ${node.chunk.startAyah}–${node.chunk.endAyah}`
            : node.surahName}
        </span>
        {!isLocked && !isMastered && (
          <span className="ml-1 text-xs text-amber-500 font-medium">+{node.xpReward} XP</span>
        )}
        {isMastered && <span className="ml-1 text-xs text-green-600">✓</span>}
      </div>
    </div>
  )
}

export default function MemorizePath({ memorizeProgress = {}, unlockedIndex = 0, onSelectModule }) {
  const [tooltip, setTooltip] = useState(null) // { node, index }
  const { ayahMastery } = useMasteryStore()

  // Show first 30 nodes to keep it performant; user scrolls to load more
  const [visibleCount, setVisibleCount] = useState(30)
  const visibleNodes = MAP_NODES.slice(0, visibleCount)

  const getNodeStatus = (node, index) => {
    if (index > unlockedIndex) return 'locked'
    if (index === unlockedIndex) return 'current'
    const progress = memorizeProgress[node.id]
    if (progress?.status === 'mastered') return 'mastered'
    return 'unlocked'
  }

  const handleNodeClick = (node, index) => {
    const status = getNodeStatus(node, index)
    if (status === 'locked') return
    setTooltip({ node, index })
  }

  const handleStart = () => {
    if (!tooltip) return
    onSelectModule?.(tooltip.node, tooltip.index)
    setTooltip(null)
  }

  // Mastery stats
  const masteredCount = Object.values(memorizeProgress).filter((p) => p?.status === 'mastered').length
  const totalVisible = visibleCount

  return (
    <div className="relative">
      {/* Floating header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Memorization Path</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{masteredCount} modules mastered</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
          <Zap size={13} className="text-amber-500" />
          <span className="text-xs font-bold text-amber-700">+XP per module</span>
        </div>
      </div>

      {/* Path */}
      <div className="flex flex-col items-center px-4 pt-8 pb-16">
        {visibleNodes.map((node, index) => (
          <MapNode
            key={node.id}
            node={node}
            index={index}
            status={getNodeStatus(node, index)}
            onClick={() => handleNodeClick(node, index)}
          />
        ))}

        {/* Load more */}
        {visibleCount < MAP_NODES.length && (
          <button
            onClick={() => setVisibleCount((c) => c + 20)}
            className="mt-4 px-6 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Load more →
          </button>
        )}
      </div>

      {/* Tooltip overlay */}
      {tooltip && (
        <NodeTooltip
          node={tooltip.node}
          onStart={handleStart}
          onClose={() => setTooltip(null)}
        />
      )}
    </div>
  )
}
