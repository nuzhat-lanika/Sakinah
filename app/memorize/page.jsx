'use client'
 
import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  saveMemorizeProgress,
  getMemorizeProgress,
  getUnlockedModuleIndex,
  setUnlockedModuleIndex,
  addUserXP,
} from '@/lib/userApi'
import { getChunkAyat } from '@/lib/quranApi'
import useMasteryStore from '@/context/masteryStore'
import MemorizePath from '@/components/MemorizePath'
import Memorizer3x3 from '@/components/Memorizer3x3'
import Link from 'next/link'
import { ArrowLeft, LogIn, X, RefreshCw } from 'lucide-react'
 
export default function MemorizePage() {
  const [user, setUser]                   = useState(null)
  const [authLoading, setAuthLoading]     = useState(true)
  const [memorizeProgress, setMemo]       = useState({})
  const [unlockedIndex, setUnlockedIndex] = useState(0)
  const [progressLoading, setProgLoading] = useState(false)
  const [activeModule, setActiveModule]   = useState(null)   // { node, index }
  const [moduleAyat, setModuleAyat]       = useState([])
  const [moduleLoading, setModLoading]    = useState(false)
  const [moduleError, setModError]        = useState(null)
  const [toast, setToast]                 = useState('')
 
  const {
    addXP: storeAddXP,
    unlockNextModule,
    unlockedModuleIndex,
    setCurrentModule,
  } = useMasteryStore()
 
  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setAuthLoading(false)
      if (u) await loadProgress(u.uid)
      else setUnlockedIndex(unlockedModuleIndex)
    })
    return () => unsub()
  }, [])
 
  const loadProgress = async (uid) => {
    setProgLoading(true)
    try {
      const [progress, idx] = await Promise.all([
        getMemorizeProgress(uid),
        getUnlockedModuleIndex(uid),
      ])
      setMemo(progress)
      setUnlockedIndex(idx)
    } catch (err) {
      console.error('[memorize] loadProgress:', err)
    } finally {
      setProgLoading(false)
    }
  }
 
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }
 
  // ── Load module data (chapter-level bundle, no per-verse calls) ─────────────
  const loadModuleData = useCallback(async (node) => {
    setModLoading(true)
    setModError(null)
    setModuleAyat([])
 
    try {
      let surahNumber = node.surah
      let startAyah   = node.chunk?.startAyah ?? 1
      let endAyah     = node.chunk?.endAyah   ?? 3
 
      // REVIEW nodes pull a random surah from recently mastered ones
      if (node.type === 'REVIEW') {
        const pool = node.reviewSurahs?.length ? node.reviewSurahs : [114]
        surahNumber = pool[Math.floor(Math.random() * pool.length)]
        startAyah   = 1
        endAyah     = 3
      }
 
      if (!surahNumber) throw new Error('No surah number on node')
 
      // getChunkAyat fetches the full chapter bundle (cached after first call),
      // then slices the requested range. Every ayah has translation + audioUrl.
      const ayat = await getChunkAyat(surahNumber, startAyah, endAyah)
 
      if (!ayat.length) throw new Error(`No ayat returned for surah ${surahNumber} ${startAyah}–${endAyah}`)
 
      setModuleAyat(ayat)
    } catch (err) {
      console.error('[memorize] loadModuleData:', err)
      setModError(err.message || 'Could not load verses.')
    } finally {
      setModLoading(false)
    }
  }, [])
 
  const handleSelectModule = async (node, index) => {
    setCurrentModule(index)
    setActiveModule({ node, index })
    await loadModuleData(node)
  }
 
  const handleModuleComplete = async () => {
    if (!activeModule) return
    const { node, index } = activeModule
    const xpAmount = node.xpReward || 20
 
    storeAddXP(xpAmount)
    showToast(`+${xpAmount} XP — Section complete! 🎉`)
 
    const newProgress = {
      moduleId:    node.id,
      surah:       node.surah || null,
      chunkId:     node.chunk?.id || null,
      status:      'mastered',
      completedAt: Date.now(),
    }
 
    if (user) {
      await Promise.all([
        saveMemorizeProgress(user.uid, newProgress),
        addUserXP(user.uid, xpAmount),
        index >= unlockedIndex
          ? setUnlockedModuleIndex(user.uid, index + 1)
          : Promise.resolve(),
      ]).catch(console.error)
    }
 
    setMemo((prev) => ({ ...prev, [node.id]: newProgress }))
    if (index >= unlockedIndex) {
      setUnlockedIndex(index + 1)
      unlockNextModule()
    }
 
    setTimeout(() => setActiveModule(null), 1400)
  }
 
  // ── Render ──────────────────────────────────────────────────────────────────
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
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-gray-800">Memorize</h1>
          <p className="text-xs text-gray-400">3×3 Hifdh Method</p>
        </div>
        {!user && (
          <Link
            href="/"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs rounded-xl hover:bg-green-800 transition-colors"
          >
            <LogIn size={12} />
            Sign in
          </Link>
        )}
      </header>
 
      {/* Active 3×3 stepper overlay */}
      {activeModule && (
        <div className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm flex flex-col overflow-y-auto">
          {/* Overlay header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button
              onClick={() => setActiveModule(null)}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              <X size={16} />
              Exit
            </button>
            <span className="text-white/50 text-xs">
              {activeModule.node.type === 'REVIEW'
                ? 'Review Session'
                : activeModule.node.surahName || `Surah ${activeModule.node.surah}`}
            </span>
          </div>
 
          {/* Stepper body */}
          <div className="flex-1 flex items-start justify-center px-4 pb-8 pt-2">
            {moduleLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 mt-20">
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-white/70 text-sm">Loading verses…</p>
              </div>
            ) : moduleError ? (
              <div className="flex flex-col items-center gap-3 mt-20 text-center px-4">
                <p className="text-white font-semibold text-lg">Could not load</p>
                <p className="text-white/60 text-sm">{moduleError}</p>
                <button
                  onClick={() => loadModuleData(activeModule.node)}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm transition-colors"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            ) : moduleAyat.length === 0 ? (
              <p className="text-white/60 text-sm mt-20">No verses found for this section.</p>
            ) : (
              <div className="w-full max-w-md">
                <Memorizer3x3
                  ayat={moduleAyat}
                  surahName={
                    activeModule.node.type === 'REVIEW'
                      ? 'Review'
                      : activeModule.node.surahName || `Surah ${activeModule.node.surah}`
                  }
                  moduleId={activeModule.node.id}
                  onComplete={handleModuleComplete}
                  onXP={(amount) => storeAddXP(typeof amount === 'number' ? amount : 5)}
                />
              </div>
            )}
          </div>
        </div>
      )}
 
      {/* Map */}
      <main className="flex-1 overflow-y-auto pb-24">
        {progressLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading your path…</p>
          </div>
        ) : (
          <MemorizePath
            memorizeProgress={memorizeProgress}
            unlockedIndex={unlockedIndex}
            onSelectModule={handleSelectModule}
          />
        )}
      </main>
 
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex z-20">
        {[
          { href: '/',          icon: '🏡', label: 'Home'     },
          { href: '/learn',     icon: '📖', label: 'Learn'    },
          { href: '/memorize',  icon: '📿', label: 'Memorize', active: true },
          { href: '/dashboard', icon: '📊', label: 'Growth'   },
        ].map(({ href, icon, label, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              active ? 'text-green-700' : 'text-gray-400 hover:text-green-700'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span className={`text-xs ${active ? 'font-medium' : ''}`}>{label}</span>
          </Link>
        ))}
      </nav>
 
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}