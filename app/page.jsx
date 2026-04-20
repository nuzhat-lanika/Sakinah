'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  updateStreak, getStreak, updateMemory, getMemory,
  saveReflection, getUserXP, addUserXP, unlockAchievement,
} from '@/lib/userApi'
import { checkNewAchievements, XP_ACTIONS } from '@/lib/gamification'
import useMasteryStore from '@/context/masteryStore'
import VerseCard from '@/components/VerseCard'
import Chat from '@/components/Chat'
import StreakCard from '@/components/StreakCard'
import LevelCard from '@/components/LevelCard'
import HadithCard from '@/components/HadithCard'
import Link from 'next/link'
import { BookOpen, BarChart2, LogOut, LogIn, User } from 'lucide-react'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [verseData, setVerseData] = useState(null)
  const [verseLoading, setVerseLoading] = useState(true)
  const [streak, setStreak] = useState(null)
  const [xpData, setXpData] = useState({ xp: 0, level: 1, achievements: [] })
  const [memory, setMemory] = useState(null)
  const [toast, setToast] = useState('')

  const { addXP: storeAddXP, syncXPFromFirebase } = useMasteryStore()

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
      if (firebaseUser) await loadUserData(firebaseUser.uid)
    })
    return () => unsub()
  }, [])

  // Load verse on mount
  useEffect(() => { fetchVerse() }, [])

  const loadUserData = async (uid) => {
    try {
      const [streakData, xp, mem] = await Promise.all([
        updateStreak(uid), getUserXP(uid), getMemory(uid),
      ])
      if (streakData) setStreak(streakData)
      if (xp) { setXpData(xp); syncXPFromFirebase(xp.xp) }
      if (mem) setMemory(mem)
    } catch (err) {
      console.error('loadUserData error:', err)
    }
  }

  const fetchVerse = async () => {
    setVerseLoading(true)
    try {
      const res = await fetch('/api/verse')
      const data = await res.json()
      setVerseData(data)
    } catch {
      setVerseData({
        verse: { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', verseKey: '94:6', surahName: 'Al-Inshirah' },
        translation: 'Indeed, with hardship comes ease.',
        tafsir: null,
        audioUrl: null,
      })
    } finally {
      setVerseLoading(false)
    }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const awardXP = useCallback(async (actionKey) => {
    const amount = XP_ACTIONS[actionKey] || 0
    if (!amount) return
    storeAddXP(amount)
    if (user) {
      const updated = await addUserXP(user.uid, amount)
      setXpData(updated)
      const stats = { reflections: 0, bookmarks: 0, grammarCorrect: 0, streak: streak?.currentStreak || 0, level: updated.level, memorizeChunks: 0, memorizedSurahs: 0 }
      const newOnes = checkNewAchievements(stats, updated.achievements || [])
      for (const id of newOnes) {
        await unlockAchievement(user.uid, id)
        showToast(`🏅 Achievement: ${id.replace(/_/g, ' ')}`)
      }
    } else {
      setXpData((prev) => ({ ...prev, xp: prev.xp + amount }))
    }
    showToast(`+${amount} XP`)
  }, [user, streak, storeAddXP])

  const handleReflection = useCallback(async (text) => {
    awardXP('REFLECTION')
    if (user && verseData) {
      const theme = guessTheme(text)
      const emotion = guessEmotion(text)
      await saveReflection(user.uid, { text, verseKey: verseData.verse?.verseKey || '', theme, emotion })
      await updateMemory(user.uid, theme, emotion)
      const mem = await getMemory(user.uid)
      if (mem) setMemory(mem)
    }
  }, [user, verseData, awardXP])

  const handleBookmark = useCallback(async () => {
    if (!verseData) return
    awardXP('BOOKMARK_VERSE')
    if (user) {
      const { saveBookmark } = await import('@/lib/userApi')
      await saveBookmark(user.uid, {
        verseKey: verseData.verse?.verseKey || '',
        arabic: verseData.verse?.arabic || '',
        translation: verseData.translation || '',
        surahName: verseData.verse?.surahName || '',
      })
      showToast('Verse bookmarked!')
    } else {
      showToast('Sign in to save bookmarks')
    }
  }, [user, verseData, awardXP])

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, googleProvider) } catch (err) { console.error('Sign in error:', err) }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    setUser(null); setStreak(null)
    setXpData({ xp: 0, level: 1, achievements: [] }); setMemory(null)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'Crimson Pro, serif', color: '#1F6F5B' }}>
            Sakin<span style={{ color: '#C9933A' }}>ah</span>
          </h1>
          {user && <p className="text-xs text-gray-400">Salam, {user.displayName?.split(' ')[0] || 'friend'}</p>}
        </div>
        <div className="flex items-center gap-2">
          {streak && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-full font-medium">
              🔥 {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
            </span>
          )}
          {user ? (
            <button onClick={handleSignOut} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors" title="Sign out">
              <LogOut size={16} />
            </button>
          ) : (
            <button onClick={handleSignIn} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs rounded-xl hover:bg-green-800 transition-colors">
              <LogIn size={12} />Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        <VerseCard
          verse={verseData?.verse?.arabic}
          translation={verseData?.translation}
          tafsir={verseData?.tafsir}
          audioUrl={verseData?.audioUrl}
          surahName={verseData?.verse?.surahName}
          verseKey={verseData?.verse?.verseKey}
          loading={verseLoading}
          onBookmark={handleBookmark}
          onRefresh={fetchVerse}
        />

        {user && (
          <>
            <StreakCard currentStreak={streak?.currentStreak || 0} longestStreak={streak?.longestStreak || 0} xp={xpData?.xp || 0} />
            <LevelCard xp={xpData?.xp || 0} />
          </>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/learn" className="bg-green-700 text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-green-800 transition-colors">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">Learn</p>
              <p className="text-white/70 text-xs">Grammar · Quizzes</p>
            </div>
          </Link>
          <Link href="/memorize" className="bg-slate-800 text-white rounded-2xl p-4 flex items-center gap-3 hover:bg-slate-900 transition-colors">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
              📿
            </div>
            <div>
              <p className="font-semibold text-sm">Memorize</p>
              <p className="text-white/70 text-xs">3x3 Hifdh Path</p>
            </div>
          </Link>
        </div>

        <HadithCard />

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 px-1">Reflection Coach</p>
          <Chat
            verse={verseData?.verse?.arabic}
            translation={verseData?.translation}
            tafsir={verseData?.tafsir}
            memory={memory}
            userId={user?.uid}
            onReflection={handleReflection}
          />
        </div>

        {!user && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-gray-700 mb-3">
              Sign in to save reflections, track your streak, and sync memorization progress.
            </p>
            <button onClick={handleSignIn} className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-xl hover:bg-green-800 transition-colors">
              <User size={14} />Continue with Google
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex z-20">
        <Link href="/" className="flex-1 flex flex-col items-center gap-1 py-3 text-green-700">
          <span className="text-lg">🏡</span>
          <span className="text-xs font-medium">Home</span>
        </Link>
        <Link href="/learn" className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-green-700 transition-colors">
          <span className="text-lg">📖</span>
          <span className="text-xs">Learn</span>
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

function guessTheme(text) {
  const lower = text.toLowerCase()
  if (lower.match(/patient|patience|wait|endure/)) return 'patience'
  if (lower.match(/stress|overwhelm|anxiety|anxious|worry/)) return 'stress'
  if (lower.match(/grateful|gratitude|thankful|bless/)) return 'gratitude'
  if (lower.match(/hope|hopeful|future|better/)) return 'hope'
  if (lower.match(/sad|grief|loss|mourn/)) return 'grief'
  if (lower.match(/purpose|meaning|why|confused/)) return 'purpose'
  if (lower.match(/trust|tawakkal|rely|faith/)) return 'trust'
  return 'reflection'
}

function guessEmotion(text) {
  const lower = text.toLowerCase()
  if (lower.match(/overwhelm|stress|anxious|anxiety|panic/)) return 'stressed'
  if (lower.match(/sad|depress|griev|mourn|lost/)) return 'sad'
  if (lower.match(/hope|optimis|better|light/)) return 'hopeful'
  if (lower.match(/grateful|thankful|bless|alhamdul/)) return 'grateful'
  if (lower.match(/calm|peace|serene|still/)) return 'calm'
  return 'neutral'
}
