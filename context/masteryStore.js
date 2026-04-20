import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Mastery levels for words and ayat.
 * 0 = New, 1-2 = Learning (Yellow), 3+ = Mastered (Green)
 * is_memorized flag set true when user clicks "Mastered" in 3x3
 */

const useMasteryStore = create(
  persist(
    (set, get) => ({
      // word mastery: { "arabic_word": { level: 0-5, lastSeen: timestamp } }
      wordMastery: {},

      // ayah mastery: { "surah:ayah": { status: 'locked'|'new'|'learning'|'mastered', attempts: number, is_memorized: boolean } }
      ayahMastery: {},

      // user XP and level (synced from Firebase but also cached locally)
      xp: 0,
      level: 1,
      hearts: 5,
      maxHearts: 5,

      // current module progress on the memorize path
      currentModuleIndex: 0,
      unlockedModuleIndex: 0,

      // grammar quiz session state
      grammarSessionXP: 0,
      grammarStreak: 0,

      // ─── Word Mastery Actions ──────────────────────────────────────────────

      /**
       * Increase a word's mastery level by 1 (max 5).
       * Called when user answers correctly in grammar quiz.
       */
      incrementWordMastery: (word) => {
        const prev = get().wordMastery
        const current = prev[word] || { level: 0, lastSeen: 0 }
        const newLevel = Math.min(current.level + 1, 5)
        set({
          wordMastery: {
            ...prev,
            [word]: { level: newLevel, lastSeen: Date.now() },
          },
        })
      },

      /**
       * Decrease a word's mastery level by 1 (min 0).
       * Called on wrong answer.
       */
      decrementWordMastery: (word) => {
        const prev = get().wordMastery
        const current = prev[word] || { level: 0, lastSeen: 0 }
        const newLevel = Math.max(current.level - 1, 0)
        set({
          wordMastery: {
            ...prev,
            [word]: { level: newLevel, lastSeen: Date.now() },
          },
        })
      },

      /**
       * Get mastery color class for a word.
       * Green = mastered (level >= 3), Yellow = learning (level 1-2), default = new
       */
      getWordColor: (word) => {
        const mastery = get().wordMastery[word]
        if (!mastery) return 'default'
        if (mastery.level >= 3) return 'green'
        if (mastery.level >= 1) return 'yellow'
        return 'default'
      },

      // ─── Ayah Mastery Actions ─────────────────────────────────────────────

      /**
       * Set an ayah's status.
       * @param {string} key - "surah:ayah" e.g. "1:1"
       * @param {'locked'|'new'|'learning'|'mastered'} status
       */
      setAyahStatus: (key, status) => {
        const prev = get().ayahMastery
        const current = prev[key] || { status: 'locked', attempts: 0, is_memorized: false }
        set({
          ayahMastery: {
            ...prev,
            [key]: { ...current, status },
          },
        })
      },

      /**
       * Mark an ayah as officially memorized (user clicked Mastered).
       * @param {string} key - "surah:ayah"
       */
      markAyahMemorized: (key) => {
        const prev = get().ayahMastery
        const current = prev[key] || { status: 'new', attempts: 0, is_memorized: false }
        set({
          ayahMastery: {
            ...prev,
            [key]: { ...current, status: 'mastered', is_memorized: true },
          },
        })
      },

      incrementAyahAttempts: (key) => {
        const prev = get().ayahMastery
        const current = prev[key] || { status: 'new', attempts: 0, is_memorized: false }
        set({
          ayahMastery: {
            ...prev,
            [key]: { ...current, attempts: current.attempts + 1 },
          },
        })
      },

      // ─── XP & Hearts ─────────────────────────────────────────────────────

      addXP: (amount) => {
        const newXP = get().xp + amount
        const newLevel = Math.floor(newXP / 100) + 1
        set({ xp: newXP, level: newLevel, grammarSessionXP: get().grammarSessionXP + amount })
      },

      loseHeart: () => {
        const current = get().hearts
        if (current > 0) set({ hearts: current - 1 })
      },

      restoreHearts: () => set({ hearts: get().maxHearts }),

      incrementGrammarStreak: () => set({ grammarStreak: get().grammarStreak + 1 }),
      resetGrammarStreak: () => set({ grammarStreak: 0 }),
      resetSessionXP: () => set({ grammarSessionXP: 0 }),

      // ─── Module Progression ───────────────────────────────────────────────

      unlockNextModule: () => {
        const next = get().unlockedModuleIndex + 1
        set({ unlockedModuleIndex: next })
      },

      setCurrentModule: (index) => set({ currentModuleIndex: index }),

      syncXPFromFirebase: (xp) => {
        const level = Math.floor(xp / 100) + 1
        set({ xp, level })
      },
    }),
    {
      name: 'sakinah-mastery',
      partialize: (state) => ({
        wordMastery: state.wordMastery,
        ayahMastery: state.ayahMastery,
        xp: state.xp,
        level: state.level,
        hearts: state.hearts,
        currentModuleIndex: state.currentModuleIndex,
        unlockedModuleIndex: state.unlockedModuleIndex,
      }),
    }
  )
)

export default useMasteryStore

// ─── Derived selectors ────────────────────────────────────────────────────────

/**
 * Get mastery color Tailwind classes for a word.
 */
export function getWordMasteryClasses(wordMastery, word) {
  const mastery = wordMastery[word]
  if (!mastery || mastery.level === 0) return 'text-slate-800 bg-slate-100'
  if (mastery.level >= 3) return 'text-green-800 bg-green-100 border-green-300'
  return 'text-amber-800 bg-amber-100 border-amber-300'
}
