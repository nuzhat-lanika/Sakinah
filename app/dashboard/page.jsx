'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getStreak, getUserXP, getMemory, getReflections } from '@/lib/userApi'
import Dashboard from '@/components/Dashboard'
import Link from 'next/link'
import { ArrowLeft, LogIn } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [data, setData] = useState({
    themes: {}, emotionLog: [], streak: 0, xp: 0,
    achievements: [], reflectionCount: 0, reflectionTexts: [],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setAuthLoading(false)
      if (u) await loadDashboardData(u.uid)
    })
    return () => unsub()
  }, [])

  const loadDashboardData = async (uid) => {
    setLoading(true)
    try {
      const [streakData, xpData, memory, reflections] = await Promise.all([
        getStreak(uid), getUserXP(uid), getMemory(uid), getReflections(uid, 20),
      ])
      setData({
        themes: memory?.themes || {},
        emotionLog: memory?.emotion_log || [],
        streak: streakData?.currentStreak || 0,
        xp: xpData?.xp || 0,
        achievements: xpData?.achievements || [],
        reflectionCount: reflections.length,
        reflectionTexts: reflections.map((r) => r.text || '').filter(Boolean),
      })
    } catch (err) {
      console.error('loadDashboardData error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInsight = useCallback(async () => {
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflections: data.reflectionTexts, themes: data.themes, emotionLog: data.emotionLog, streak: data.streak }),
      })
      const result = await res.json()
      return result.insight || null
    } catch { return null }
  }, [data])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-gray-800">Spiritual Growth</h1>
          <p className="text-xs text-gray-400">Your journey over time</p>
        </div>
        {user && (
          <button onClick={() => loadDashboardData(user.uid)} className="ml-auto text-xs text-green-700 hover:underline">
            Refresh
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
            <div className="text-4xl">📊</div>
            <p className="text-gray-500 text-sm max-w-xs">Sign in to track your spiritual growth and receive AI-powered insights.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-xl hover:bg-green-800 transition-colors">
              <LogIn size={14} />Sign in on Home
            </Link>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading your journey…</p>
          </div>
        ) : (
          <Dashboard
            themes={data.themes} emotionLog={data.emotionLog} streak={data.streak}
            xp={data.xp} achievements={data.achievements} reflectionCount={data.reflectionCount}
            onGenerateInsight={handleGenerateInsight}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex z-20">
        <Link href="/" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">🏡</span><span className="text-xs">Home</span>
        </Link>
        <Link href="/learn" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">📖</span><span className="text-xs">Learn</span>
        </Link>
        <Link href="/memorize" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">📿</span><span className="text-xs">Memorize</span>
        </Link>
        <Link href="/dashboard" className="flex-1 flex flex-col items-center gap-1 py-3 text-green-700">
          <span className="text-lg">📊</span><span className="text-xs font-medium">Growth</span>
        </Link>
      </nav>
    </div>
  )
}
