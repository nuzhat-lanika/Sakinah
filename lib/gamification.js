export const XP_ACTIONS = {
  REFLECTION: 10,
  GRAMMAR_CORRECT: 15,
  GRAMMAR_WRONG: 0,
  GRAMMAR_STREAK_BONUS: 5,
  GRAMMAR_ANALYZE: 8,
  BOOKMARK_VERSE: 3,
  LISTEN_VERSE: 1,
  DAILY_CHALLENGE: 20,
  STREAK_BONUS: 5,
  INSIGHT_GENERATE: 5,
  MEMORIZE_COMPLETE_CHUNK: 20,
  MEMORIZE_COMPLETE_SURAH: 50,
  IMPACT_QUOTE: 2,
}

export const LEVEL_NAMES = [
  '',
  'Seeker',
  'Reflector',
  'Thinker',
  'Contemplator',
  'Learner',
  'Scholar',
  'Sage',
  'Illuminated',
]

export function getLevelFromXP(xp) {
  return Math.floor((xp || 0) / 100) + 1
}

export function getXPForNextLevel(level) {
  return level * 100
}

export function getLevelProgress(xp) {
  const level = getLevelFromXP(xp)
  const base = (level - 1) * 100
  const next = level * 100
  return Math.round(((xp - base) / (next - base)) * 100)
}

export function getLevelName(level) {
  return LEVEL_NAMES[level] || 'Master'
}

export const ACHIEVEMENTS = [
  {
    id: 'first_reflection',
    label: 'First Reflection',
    icon: '✍️',
    description: 'Write your first reflection',
    condition: (s) => s.reflections >= 1,
  },
  {
    id: 'first_bookmark',
    label: 'Bookmarker',
    icon: '🔖',
    description: 'Save your first verse',
    condition: (s) => s.bookmarks >= 1,
  },
  {
    id: 'grammar_starter',
    label: 'Linguist',
    icon: '🔤',
    description: 'Answer 10 grammar questions correctly',
    condition: (s) => s.grammarCorrect >= 10,
  },
  {
    id: 'streak_3',
    label: '3-Day Streak',
    icon: '🔥',
    description: 'Reflect for 3 days in a row',
    condition: (s) => s.streak >= 3,
  },
  {
    id: 'streak_7',
    label: 'Week of Wisdom',
    icon: '🌟',
    description: 'Reflect for 7 days in a row',
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'level_3',
    label: 'Deep Thinker',
    icon: '🧠',
    description: 'Reach Level 3',
    condition: (s) => s.level >= 3,
  },
  {
    id: 'first_memorize',
    label: 'Hifz Begins',
    icon: '📿',
    description: 'Complete your first memorization chunk',
    condition: (s) => s.memorizeChunks >= 1,
  },
  {
    id: 'first_surah',
    label: 'Surah Complete',
    icon: '🌙',
    description: 'Memorize your first full Surah',
    condition: (s) => s.memorizedSurahs >= 1,
  },
]

export function checkNewAchievements(stats, alreadyUnlocked = []) {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.includes(a.id) && a.condition(stats)
  ).map((a) => a.id)
}
