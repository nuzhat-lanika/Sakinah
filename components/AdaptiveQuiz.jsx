'use client'

import { useState, useEffect, useCallback } from 'react'
import { Heart, Zap, BookOpen, Loader2, CheckCircle, XCircle, Trophy } from 'lucide-react'
import useMasteryStore, { getWordMasteryClasses } from '@/context/masteryStore'

const ENCOURAGEMENTS_CORRECT = [
  'Excellent! 🌟', 'Perfect! ✨', 'Mashallah! 💚', 'Keep going! 🔥', 'Brilliant! ⚡',
]
const ENCOURAGEMENTS_WRONG = [
  'Not quite — keep going', 'Almost there!', 'Review and retry', "You'll get it!",
]

export default function AdaptiveQuiz({ verse, verseKey, userId, onXP }) {
  const {
    wordMastery, incrementWordMastery, decrementWordMastery, getWordColor,
    hearts, loseHeart, grammarStreak, incrementGrammarStreak, resetGrammarStreak,
    addXP: storeAddXP,
  } = useMasteryStore()

  const [analysis, setAnalysis] = useState([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [selected, setSelected] = useState(null)

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizQueue, setQuizQueue] = useState([]) // words to quiz
  const [currentIdx, setCurrentIdx] = useState(0)
  const [options, setOptions] = useState([])
  const [chosen, setChosen] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong'
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 })
  const [quizDone, setQuizDone] = useState(false)
  const [encouragement, setEncouragement] = useState('')

  const analyzeVerse = async () => {
    if (!verse) return
    setLoading(true)
    setAnalyzed(false)
    setSelected(null)
    setAnalysis([])
    try {
      const res = await fetch('/api/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseArabic: verse }),
      })
      const data = await res.json()
      if (data.analysis?.length) {
        setAnalysis(data.analysis)
        setAnalyzed(true)
        onXP?.('GRAMMAR_ANALYZE')
      }
    } catch {
      alert('Could not analyze. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Build distractor options. Difficulty scales with level.
  const buildOptions = useCallback((item, allWords, level = 1) => {
    const numDistractors = Math.min(1 + level, 3) // level 1→2 opts, level 3+→4 opts
    const others = allWords.filter((w) => w.word !== item.word)
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, numDistractors)
    const opts = [item, ...shuffled].sort(() => Math.random() - 0.5)
    return opts
  }, [])

  const userLevel = useMasteryStore((s) => s.level)

  const startQuiz = () => {
    if (!analysis.length) return
    // Prioritize: New > Learning > Mastered (spaced repetition feel)
    const sorted = [...analysis].sort((a, b) => {
      const la = wordMastery[a.word]?.level || 0
      const lb = wordMastery[b.word]?.level || 0
      return la - lb
    })
    setQuizQueue(sorted)
    setCurrentIdx(0)
    setOptions(buildOptions(sorted[0], analysis, userLevel))
    setChosen(null)
    setFeedback(null)
    setSessionScore({ correct: 0, total: 0 })
    setQuizStarted(true)
    setQuizDone(false)
  }

  const currentWord = quizQueue[currentIdx]

  const handleAnswer = (opt) => {
    if (chosen) return
    setChosen(opt)
    const correct = opt.word === currentWord.word

    if (correct) {
      incrementWordMastery(currentWord.word)
      incrementGrammarStreak()
      storeAddXP(15)
      onXP?.('GRAMMAR_CORRECT')
      setFeedback('correct')
      setSessionScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }))
      setEncouragement(ENCOURAGEMENTS_CORRECT[Math.floor(Math.random() * ENCOURAGEMENTS_CORRECT.length)])
    } else {
      decrementWordMastery(currentWord.word)
      resetGrammarStreak()
      loseHeart()
      onXP?.('GRAMMAR_WRONG')
      setFeedback('wrong')
      setSessionScore((s) => ({ correct: s.correct, total: s.total + 1 }))
      setEncouragement(ENCOURAGEMENTS_WRONG[Math.floor(Math.random() * ENCOURAGEMENTS_WRONG.length)])
    }
  }

  const nextQuestion = () => {
    if (currentIdx + 1 >= quizQueue.length) {
      setQuizDone(true)
    } else {
      const next = currentIdx + 1
      setCurrentIdx(next)
      setOptions(buildOptions(quizQueue[next], analysis, userLevel))
      setChosen(null)
      setFeedback(null)
      setEncouragement('')
    }
  }

  const getMasteryBadge = (word) => {
    const color = getWordColor(word)
    if (color === 'green') return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Mastered</span>
    if (color === 'yellow') return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Learning</span>
    return <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">New</span>
  }

  // Hearts display
  const heartsDisplay = Array.from({ length: 5 }, (_, i) => (
    <Heart
      key={i}
      size={16}
      className={i < hearts ? 'text-red-500 fill-red-500' : 'text-gray-200 fill-gray-200'}
    />
  ))

  if (!analyzed) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Grammar Quiz</p>
          <p
            className="text-center leading-loose text-green-800 mb-4"
            style={{ fontFamily: 'Amiri, serif', fontSize: '24px', direction: 'rtl' }}
          >
            {verse || '...'}
          </p>
          <button
            onClick={analyzeVerse}
            disabled={loading || !verse}
            className="w-full py-3 rounded-2xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
            {loading ? 'Analyzing…' : 'Analyze & Start Quiz'}
          </button>
        </div>
      </div>
    )
  }

  if (!quizStarted) {
    return (
      <div className="space-y-4">
        {/* Word breakdown with mastery colors */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Word Breakdown</p>
          <div className="flex flex-wrap gap-2 justify-center mb-4" style={{ direction: 'rtl' }}>
            {analysis.map((item, i) => {
              const color = getWordColor(item.word)
              const baseClass = color === 'green'
                ? 'bg-green-50 border-green-300 text-green-800'
                : color === 'yellow'
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-gray-50 border-gray-200 text-slate-800'
              return (
                <button
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${baseClass} ${selected === i ? 'ring-2 ring-offset-1 ring-green-500' : ''}`}
                >
                  <span style={{ fontFamily: 'Amiri, serif', fontSize: '22px', direction: 'rtl' }}>{item.word}</span>
                  <span className="text-xs opacity-60 tracking-wide uppercase" style={{ direction: 'ltr', fontSize: '9px' }}>
                    {item.grammar?.split(' ').slice(0, 2).join(' ')}
                  </span>
                </button>
              )
            })}
          </div>

          {selected !== null && analysis[selected] && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-slide-up">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span style={{ fontFamily: 'Amiri, serif', fontSize: '22px', direction: 'rtl' }} className="text-green-800">{analysis[selected].word}</span>
                  <p className="text-sm font-medium text-gray-800 mt-1">{analysis[selected].translation}</p>
                  <p className="text-xs text-gray-400">{analysis[selected].transliteration}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap">{analysis[selected].grammar}</span>
                  {getMasteryBadge(analysis[selected].word)}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed border-t border-slate-200 pt-3">{analysis[selected].explanation}</p>
            </div>
          )}
        </div>

        {/* Start quiz CTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Practice Quiz</p>
            <div className="flex gap-1">{heartsDisplay}</div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Match each Arabic word to its meaning. Words you master turn <span className="text-green-700 font-medium">green</span> across the whole app.
          </p>
          <button
            onClick={startQuiz}
            className="w-full py-3 rounded-2xl bg-duolingo-green text-white font-bold text-base hover:opacity-90 transition-opacity shadow-sm"
            style={{ background: '#58CC02', boxShadow: '0 4px 0 #45a800' }}
          >
            Start Practice
          </button>
        </div>
      </div>
    )
  }

  if (quizDone) {
    const accuracy = sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center animate-bounce-in">
        <Trophy size={48} className="mx-auto mb-3 text-amber-500" />
        <h2 className="text-xl font-bold text-gray-800 mb-1">Quiz Complete!</h2>
        <p className="text-gray-500 text-sm mb-4">
          {sessionScore.correct}/{sessionScore.total} correct · {accuracy}% accuracy
        </p>
        <div className="flex gap-3 justify-center mb-4">
          <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-700">+{sessionScore.correct * 15}</p>
            <p className="text-xs text-gray-500">XP earned</p>
          </div>
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-amber-600">{grammarStreak}</p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startQuiz}
            className="flex-1 py-3 rounded-2xl text-white font-bold"
            style={{ background: '#58CC02', boxShadow: '0 4px 0 #45a800' }}
          >
            Practice Again
          </button>
          <button
            onClick={() => { setQuizStarted(false); setQuizDone(false) }}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            Word Review
          </button>
        </div>
      </div>
    )
  }

  // Active quiz question
  return (
    <div className="space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex gap-1">{heartsDisplay}</div>
        <div className="flex items-center gap-1.5 text-amber-600">
          <Zap size={14} className="fill-amber-500" />
          <span className="text-sm font-bold">{grammarStreak} streak</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">{currentIdx + 1}/{quizQueue.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentIdx + 1) / quizQueue.length) * 100}%`, background: '#58CC02' }}
        />
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-4">
          What does this word mean?
        </p>
        <div className="flex flex-col items-center mb-6">
          <span
            className={`px-6 py-4 rounded-2xl border-2 text-4xl ${getWordMasteryClasses(wordMastery, currentWord?.word)}`}
            style={{ fontFamily: 'Amiri, serif', direction: 'rtl' }}
          >
            {currentWord?.word}
          </span>
          <span className="text-xs text-gray-400 mt-2">{currentWord?.transliteration}</span>
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-1 gap-2">
          {options.map((opt) => {
            let style = 'border-2 border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
            if (chosen) {
              if (opt.word === currentWord.word) {
                style = 'border-2 border-green-500 bg-green-50 text-green-800'
              } else if (opt.word === chosen.word && opt.word !== currentWord.word) {
                style = 'border-2 border-red-400 bg-red-50 text-red-700 animate-shake'
              } else {
                style = 'border-2 border-gray-100 bg-gray-50 text-gray-400 opacity-60'
              }
            }
            return (
              <button
                key={opt.word}
                onClick={() => handleAnswer(opt)}
                disabled={!!chosen}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${style}`}
              >
                <span>{opt.translation}</span>
                {chosen && opt.word === currentWord.word && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">{opt.grammar}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback footer */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 animate-slide-up ${feedback === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            {feedback === 'correct'
              ? <CheckCircle size={18} className="text-green-600" />
              : <XCircle size={18} className="text-red-500" />}
            <span className={`font-bold text-sm ${feedback === 'correct' ? 'text-green-700' : 'text-red-600'}`}>
              {encouragement}
            </span>
          </div>
          {feedback === 'wrong' && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">{currentWord?.word}</span> means &ldquo;{currentWord?.translation}&rdquo; — {currentWord?.grammar}
            </p>
          )}
          <p className="text-xs text-gray-500 mb-3">{currentWord?.explanation}</p>
          <button
            onClick={nextQuestion}
            className={`w-full py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 ${feedback === 'correct' ? 'bg-green-600' : 'bg-red-500'}`}
          >
            {currentIdx + 1 >= quizQueue.length ? 'See Results →' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  )
}
