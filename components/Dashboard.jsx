'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ACHIEVEMENTS } from '@/lib/gamification'

const EMOTION_VALUES = { anxious: 1, stressed: 1, sad: 2, neutral: 3, calm: 4, hopeful: 4, grateful: 5, peaceful: 5 }

function emotionToValue(emotion) {
  if (!emotion) return 3
  const lower = emotion.toLowerCase()
  for (const [key, val] of Object.entries(EMOTION_VALUES)) { if (lower.includes(key)) return val }
  return 3
}

export default function Dashboard({ themes = {}, emotionLog = [], streak = 0, xp = 0, achievements = [], reflectionCount = 0, onGenerateInsight }) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)

  const chartData = (emotionLog || []).slice(-14).map((e) => ({ date: e.date ? e.date.slice(5) : '', value: emotionToValue(e.emotion), emotion: e.emotion || 'neutral' }))
  const topThemes = Object.entries(themes || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxTheme = topThemes.length ? topThemes[0][1] : 1

  const handleInsight = async () => {
    setLoading(true)
    try { const result = await onGenerateInsight?.(); if (result) setInsight(result) } finally { setLoading(false) }
  }

  const unlockedIds = new Set(achievements)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100"><div className="text-2xl font-semibold text-green-700">🔥 {streak}</div><div className="text-xs text-gray-400 mt-1">Day Streak</div></div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100"><div className="text-2xl font-semibold text-amber-500">{xp}</div><div className="text-xs text-gray-400 mt-1">Total XP</div></div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100"><div className="text-2xl font-semibold text-green-700">{reflectionCount}</div><div className="text-xs text-gray-400 mt-1">Reflections</div></div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Emotional Trend</p>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={(v) => ['', 'Stressed', 'Sad', 'Neutral', 'Calm', 'Peaceful'][v] || ''} tick={{ fontSize: 9, fill: '#9ca3af' }} width={58} />
              <Tooltip formatter={(value, name, props) => [props.payload.emotion, 'Mood']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="value" stroke="#1F6F5B" strokeWidth={2} dot={{ r: 4, fill: '#1F6F5B' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-gray-400 text-center py-8">Complete reflections to see your emotional trend.</p>}
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Reflection Themes</p>
        {topThemes.length ? (
          <div className="space-y-3">
            {topThemes.map(([theme, count]) => (
              <div key={theme}>
                <div className="flex justify-between text-sm mb-1"><span className="capitalize text-gray-700">{theme}</span><span className="text-gray-400">{count}×</span></div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${Math.round((count / maxTheme) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-4">Your most reflected themes will appear here.</p>}
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Weekly Insight</p>
          <button onClick={handleInsight} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? 'Analyzing…' : 'Generate'}
          </button>
        </div>
        {insight ? (
          <div className="space-y-3">
            <div className="bg-green-700 rounded-xl p-4 text-white"><p className="text-xs text-white/60 mb-2">Your Insight</p><p style={{ fontFamily: 'Crimson Pro, serif', fontSize: '15px', lineHeight: '1.65' }}>{insight.insight}</p></div>
            <div className="grid grid-cols-2 gap-2">
              {insight.growth_signal && <div className="bg-green-50 rounded-xl p-3 border border-green-100"><p className="text-xs text-green-700 font-medium mb-1">🌱 Growth Signal</p><p className="text-xs text-gray-600 leading-relaxed">{insight.growth_signal}</p></div>}
              {insight.key_struggle && <div className="bg-amber-50 rounded-xl p-3 border border-amber-100"><p className="text-xs text-amber-700 font-medium mb-1">⚡ Key Struggle</p><p className="text-xs text-gray-600 leading-relaxed">{insight.key_struggle}</p></div>}
            </div>
            {insight.action_step && <div className="bg-blue-50 rounded-xl p-3 border border-blue-100"><p className="text-xs text-blue-700 font-medium mb-1">🎯 Tomorrow's Step</p><p className="text-xs text-gray-700 leading-relaxed">{insight.action_step}</p></div>}
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-4">Generate an AI-powered analysis of your growth journey.</p>}
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Achievements</p>
        <div className="grid grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((ach) => (
            <div key={ach.id} title={ach.description} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-opacity ${unlockedIds.has(ach.id) ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <span className="text-2xl">{ach.icon}</span>
              <span className="text-xs text-center text-gray-600 leading-tight">{ach.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
