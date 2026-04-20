'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { addUserXP } from '@/lib/userApi'
import { XP_ACTIONS } from '@/lib/gamification'
import useMasteryStore from '@/context/masteryStore'
import AdaptiveQuiz from '@/components/AdaptiveQuiz'
import ImpactQuote from '@/components/ImpactQuote'
import Link from 'next/link'
import { ArrowLeft, Heart, Zap, RefreshCw } from 'lucide-react'

export default function LearnPage() {
  const [user, setUser] = useState(null)
  const [verseData, setVerseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('quiz') // 'quiz' | 'quote'

  const { hearts, xp, level, grammarStreak, addXP: storeAddXP } = useMasteryStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    loadVerse()
  }, [])

  const loadVerse = () => {
    setLoading(true)
    fetch('/api/verse')
      .then((r) => r.json())
      .then((d) => setVerseData(d))
      .catch(() =>
        setVerseData({
          verse: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', verseKey: '94:6', surahName: 'Al-Inshirah' },
          translation: 'Indeed, with hardship comes ease.',
          tafsir: null,
        })
      )
      .finally(() => setLoading(false))
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const handleXP = async (actionKey) => {
    const amount = XP_ACTIONS[actionKey] || 0
    if (!amount) return
    storeAddXP(amount)
    if (user) {
      await addUserXP(user.uid, amount).catch(() => {})
    }
    showToast(`+${amount} XP`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-gray-800">Learn</h1>
              <p className="text-xs text-gray-400">Grammar · Vocabulary · Insights</p>
            </div>
          </div>

          {/* HUD — hearts + streak */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Heart
                  key={i}
                  size={14}
                  className={i < hearts ? 'text-red-500 fill-red-500' : 'text-gray-200 fill-gray-200'}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <Zap size={12} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700">{grammarStreak}</span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-3 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'quiz'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Grammar Quiz
          </button>
          <button
            onClick={() => setActiveTab('quote')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'quote'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Impact Quote
          </button>
        </div>
      </header>

      {/* Current verse banner */}
      <div className="mx-4 mt-4 bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-widest">Studying</p>
          <p
            className="leading-loose truncate"
            style={{ fontFamily: 'Amiri, serif', fontSize: '20px', direction: 'rtl' }}
          >
            {verseData?.verse?.arabic}
          </p>
          <p
            className="text-slate-400 text-xs mt-1 truncate"
            style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic' }}
          >
            {verseData?.translation}
          </p>
        </div>
        <button
          onClick={loadVerse}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 flex-shrink-0 transition-colors"
          title="New verse"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24 space-y-4 overflow-y-auto">
        {activeTab === 'quiz' && (
          <AdaptiveQuiz
            verse={verseData?.verse?.arabic}
            verseKey={verseData?.verse?.verseKey}
            userId={user?.uid}
            onXP={handleXP}
          />
        )}

        {activeTab === 'quote' && (
          <ImpactQuote
            verse={verseData?.verse?.arabic}
            translation={verseData?.translation}
            verseKey={verseData?.verse?.verseKey}
            onXP={handleXP}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex z-20">
        <Link href="/" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">🏡</span>
          <span className="text-xs">Home</span>
        </Link>
        <Link href="/learn" className="flex-1 flex flex-col items-center gap-1 py-3 text-green-700">
          <span className="text-lg">📖</span>
          <span className="text-xs font-medium">Learn</span>
        </Link>
        <Link href="/memorize" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">📿</span>
          <span className="text-xs">Memorize</span>
        </Link>
        <Link href="/dashboard" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">📊</span>
          <span className="text-xs">Growth</span>
        </Link>
      </nav>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}
