'use client'
 
/**
 * Memorizer3x3.jsx  — Production refactor
 *
 * Bugs fixed:
 * 1. Soak completion bug — SoakAyah previously had per-ayah state and per-ayah
 *    "Rep Done" buttons. Clicking the first ayah's button completed the rep even
 *    though remaining ayahs were untouched. Fixed by tracking all words across
 *    all ayahs in a SINGLE flat Set<"ayahIdx:wordIdx"> inside the parent component,
 *    and showing only ONE Rep Done button for the entire section.
 *
 * 2. Sequential word locking — words must be tapped left→right (RTL: right→left
 *    visually, but index 0 first). Each word is locked until all previous words
 *    in the same ayah are clicked, and Ayah N is fully locked until Ayah N-1 is done.
 *
 * 3. Audio 7-second cutoff — was caused by stopping the MediaStream tracks inside
 *    stopRecording() synchronously, before the browser could flush the last chunk.
 *    Fix: tracks are stopped ONLY inside the onstop callback (after all data is collected).
 *    mediaRecorder.start(250) collects chunks every 250ms for smoother accumulation.
 *
 * 4. Audio mode toggle — clicking a word plays its recitation audio if enabled.
 *
 * 5. Font-size controls — slider in header adjusts Arabic + translation size.
 *
 * 6. Translation always visible — hierarchy: translation → Arabic → verse number.
 *    No conditional hiding anywhere.
 *
 * 7. One Rep Done button for whole section — appears below all ayahs, only enabled
 *    when every word in every ayah is clicked.
 */
 
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Mic, Square, ChevronRight, Volume2, VolumeX, CheckCircle,
  SkipForward, Minus, Plus,
} from 'lucide-react'
import useMasteryStore, { getWordMasteryClasses } from '@/context/masteryStore'
 
// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_RECORDING_SECONDS = 300  // 5 minutes
const WARNING_SECONDS       = 30
const DEFAULT_ARABIC_SIZE   = 26   // px
const MIN_FONT              = 18
const MAX_FONT              = 40
 
const ENCOURAGEMENTS = [
  'Your memory is growing. Keep going.',
  'Every rep is a seed planted in the heart.',
  "That's one round done. Six more builds the foundation.",
  'Subhan Allah — you are doing this.',
  'The angels witness your effort.',
  'This is exactly how Hifdh is built.',
  "Breathe. You're making real progress.",
]
 
// ─── Countdown timer ─────────────────────────────────────────────────────────
 
function RecordingTimer({ isRecording, onTimeUp }) {
  const [secs, setSecs] = useState(MAX_RECORDING_SECONDS)

  useEffect(() => {
    if (!isRecording) {
      setSecs(MAX_RECORDING_SECONDS)  // resets only when isRecording goes false
      return
    }
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(id); onTimeUp(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRecording, onTimeUp])
 
  const mm  = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss  = String(secs % 60).padStart(2, '0')
  const warn = secs <= WARNING_SECONDS
 
  return (
    <div className={`text-center ${warn ? 'animate-pulse' : ''}`}>
      <p className={`text-3xl font-mono font-bold ${warn ? 'text-red-500' : 'text-slate-700'}`}>
        {mm}:{ss}
      </p>
      {warn && <p className="text-xs text-red-500 mt-0.5 font-medium">Recording ends soon</p>}
    </div>
  )
}
 
// ─── Progress dots (look-step reps) ──────────────────────────────────────────
 
function ProgressDots({ target, current, onTap }) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {Array.from({ length: target }).map((_, i) => (
        <button
          key={i}
          onClick={() => onTap(i + 1)}
          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all select-none ${
            i < current
              ? 'bg-green-500 border-green-600 text-white scale-105 shadow-sm'
              : 'bg-white border-gray-300 text-gray-400 hover:border-green-400'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function Memorizer3x3({ ayat, surahName, moduleId, onComplete, onXP }) {
  const { wordMastery, markAyahMemorized, incrementAyahAttempts } = useMasteryStore()
 
  // ── UI / step state ──────────────────────────────────────────────────────
  const [currentStep,   setCurrentStep]   = useState(0)
  const [repCount,      setRepCount]       = useState(0)  // look steps
  const [soakRound,     setSoakRound]      = useState(0)  // 0-6
  const [encouragement, setEncouragement]  = useState('')
  const [masterClicked, setMasterClicked]  = useState(false)
 
  // ── Soak state — SINGLE flat Set across ALL ayahs ───────────────────────
  // Key format: "ayahIdx:wordIdx"  e.g. "0:3"
  const [clickedWords, setClickedWords] = useState(new Set())
 
  // ── Audio mode toggle ────────────────────────────────────────────────────
  const [audioMode,   setAudioMode]   = useState(false)  // tap-to-hear
  const [playingKey,  setPlayingKey]  = useState(null)
  const wordAudioRefs = useRef({})  // cache Audio objects for word clips
  const ayahAudioRefs = useRef({})  // cache Audio objects for full-ayah clips
 
  // ── Font size ────────────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState(DEFAULT_ARABIC_SIZE)
  const translationSize = Math.max(13, fontSize - 8)
 
  // ── Recording ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL,    setAudioURL]    = useState(null)
  const [revealed,    setRevealed]    = useState(false)
  const mediaRecorder = useRef(null)
  const audioChunks   = useRef([])
  const streamRef     = useRef(null)
 
  // ── Derived values ───────────────────────────────────────────────────────
  const steps        = useMemo(() => buildSteps(ayat), [ayat])
  const activeStep   = steps[currentStep]
  const totalSteps   = steps.length
  const isSoakStep   = activeStep?.type === 'soak'
  const isBlindStep  = activeStep?.type === 'blind'
  const activeAyat   = (activeStep?.ayatIndices || []).map((i) => ayat[i]).filter(Boolean)
 
  // Total words across all active ayahs — used for soak completion check
  const totalSectionWords = useMemo(
    () => activeAyat.reduce((sum, a) => sum + (a.text_uthmani?.split(' ').filter(Boolean).length || 0), 0),
    [activeAyat]
  )
 
  const allWordsClicked  = clickedWords.size >= totalSectionWords
  const soakRoundsDone   = soakRound   // 0-indexed; 7 rounds = complete
  const soakProgress     = (soakRound / 7) * 100
  const overallProgress  = ((currentStep + 1) / totalSteps) * 100
  const canProceed       = activeStep?.type === 'look' ? repCount >= activeStep.target : false
 
  // ── Preload full-ayah audio when ayat change ─────────────────────────────
  useEffect(() => {
    activeAyat.forEach((ayah) => {
      if (ayah.audioUrl && !ayahAudioRefs.current[ayah.verse_key]) {
        const audio = new Audio(ayah.audioUrl)
        audio.preload = 'auto'
        audio.onended = () => setPlayingKey(null)
        ayahAudioRefs.current[ayah.verse_key] = audio
      }
    })
  }, [activeAyat])
 
  // Reset soak clicks when round increments or step changes
  useEffect(() => { setClickedWords(new Set()) }, [soakRound, currentStep])
 
  // ── Ayah audio playback ──────────────────────────────────────────────────
  const playAyahAudio = useCallback((verseKey) => {
    const audio = ayahAudioRefs.current[verseKey]
    if (!audio) return
    if (playingKey === verseKey) {
      audio.pause(); audio.currentTime = 0; setPlayingKey(null)
    } else {
      if (playingKey && ayahAudioRefs.current[playingKey]) {
        ayahAudioRefs.current[playingKey].pause()
        ayahAudioRefs.current[playingKey].currentTime = 0
      }
      audio.play().catch(() => {})
      setPlayingKey(verseKey)
    }
  }, [playingKey])
 
  // ── Soak word click ──────────────────────────────────────────────────────
  /**
   * Words must be tapped in order within each ayah, and Ayah N is fully
   * locked until Ayah N-1 is completed.
   *
   * Lock logic:
   * - A word at position [ayahIdx:wordIdx] is locked when:
   *   a) Any earlier word in the same ayah is not yet clicked, OR
   *   b) Any word in a previous ayah is not yet clicked.
   */
  const handleWordTap = useCallback((ayahIdx, wordIdx, word) => {
    // Check sequential lock: all words in previous ayahs must be done
    for (let ai = 0; ai < ayahIdx; ai++) {
      const ayah = activeAyat[ai]
      const wc   = ayah?.text_uthmani?.split(' ').filter(Boolean).length || 0
      for (let wi = 0; wi < wc; wi++) {
        if (!clickedWords.has(`${ai}:${wi}`)) return  // locked
      }
    }
    // Check sequential lock within current ayah
    for (let wi = 0; wi < wordIdx; wi++) {
      if (!clickedWords.has(`${ayahIdx}:${wi}`)) return  // locked
    }
 
    const key = `${ayahIdx}:${wordIdx}`
    if (clickedWords.has(key)) return  // already tapped
 
    setClickedWords((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
 
    // Audio mode: play word recitation if a URL is available
    // (We use the full-ayah audio as a fallback — quran.com doesn't offer per-word clips.)
    if (audioMode) {
      const ayah = activeAyat[ayahIdx]
      if (ayah?.audioUrl) playAyahAudio(ayah.verse_key)
    }
  }, [clickedWords, activeAyat, audioMode, playAyahAudio])
 
  // ── Soak round complete ──────────────────────────────────────────────────
  const handleSoakRoundDone = () => {
    if (!allWordsClicked) return
    const nextRound = soakRound + 1
    if (nextRound >= 7) {
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
      setSoakRound(0)
      setCurrentStep((s) => s + 1)
      setRepCount(0)
    } else {
      setSoakRound(nextRound)
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
    }
  }
 
  // ── Look-step rep count ──────────────────────────────────────────────────
  const handleRepTap = (count) => {
    setRepCount(count)
    if (count >= (activeStep?.target || 0)) {
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
    }
  }
 
  // ── Step advance ─────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (isBlindStep) {
      ayat.forEach((a) => {
        const k = `${a.surah_number}:${a.verse_number}`
        markAyahMemorized(k)
        incrementAyahAttempts(k)
      })
      setMasterClicked(true)
      onXP?.(20)
      setTimeout(() => onComplete?.(), 1300)
      return
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1)
      setRepCount(0)
      setAudioURL(null)
      setRevealed(false)
      setEncouragement('')
    }
  }, [isBlindStep, currentStep, totalSteps, ayat, markAyahMemorized, incrementAyahAttempts, onXP, onComplete])
 
  const handleSkipToBlind = () => {
    const idx = steps.findIndex((s) => s.type === 'blind')
    if (idx > -1) { setCurrentStep(idx); setRepCount(0); setAudioURL(null); setRevealed(false); setEncouragement('') }
  }
 
  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    // Guard: don't start if already recording
    if (isRecording || mediaRecorder.current?.state === 'recording') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick the best supported MIME type for this browser.
      // webm/opus is best on Chrome/Firefox; fall back to whatever is supported.
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((m) => MediaRecorder.isTypeSupported(m)) || ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      audioChunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        // ALL ondataavailable events have fired before onstop.
        // Build the blob here — this is the only safe place.
        const blob = new Blob(audioChunks.current, {
          type: mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        setAudioURL(url)
        setRevealed(true)
        // NOW it is safe to release the mic — all data is captured.
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        // Update UI state only after blob is ready
        setIsRecording(false)
      }

      // 1000ms timeslice: one chunk per second.
      // More stable than 250ms across browsers, still gives ~300 chunks max for 5 min.
      recorder.start(1000)
      mediaRecorder.current = recorder
      setIsRecording(true)
      setRevealed(false)
      setAudioURL(null)
    } catch (err) {
      console.error('[Memorizer] startRecording error:', err)
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow access in browser settings and try again.'
        : 'Could not access microphone. Check your device settings.'
      alert(msg)
    }
  }

  const stopRecording = useCallback(() => {
    // Only call stop() if currently recording — prevents double-stop
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop()
      // setIsRecording(false) is intentionally NOT called here.
      // It is called inside recorder.onstop after the blob is built.
      // This prevents the RecordingTimer from seeing isRecording=false prematurely
      // and prevents any race condition with the final ondataavailable event.
    }
    // Do NOT touch streamRef here — onstop handles track cleanup.
  }, [])

  const handleTimeUp = useCallback(() => {
    // Called by RecordingTimer at 0:00. Same as manual stop.
    stopRecording()
  }, [stopRecording])
  
 
  // ── Helpers ───────────────────────────────────────────────────────────────
  const isWordLocked = (ayahIdx, wordIdx) => {
    // All previous ayahs must be fully clicked
    for (let ai = 0; ai < ayahIdx; ai++) {
      const wc = activeAyat[ai]?.text_uthmani?.split(' ').filter(Boolean).length || 0
      for (let wi = 0; wi < wc; wi++) {
        if (!clickedWords.has(`${ai}:${wi}`)) return true
      }
    }
    // All previous words in this ayah must be clicked
    for (let wi = 0; wi < wordIdx; wi++) {
      if (!clickedWords.has(`${ayahIdx}:${wi}`)) return true
    }
    return false
  }
 
  const nextWordLabel = () => {
    for (let ai = 0; ai < activeAyat.length; ai++) {
      const words = activeAyat[ai]?.text_uthmani?.split(' ').filter(Boolean) || []
      for (let wi = 0; wi < words.length; wi++) {
        if (!clickedWords.has(`${ai}:${wi}`)) return words[wi]
      }
    }
    return null
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-md mx-auto">
 
      {/* ── Header ── */}
      <div className="bg-slate-900 px-5 pt-5 pb-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">{surahName}</span>
          <span className="text-xs font-bold bg-green-500 px-2.5 py-1 rounded-full">
            {currentStep + 1}/{totalSteps}
          </span>
        </div>
 
        {/* Overall progress */}
        <div className="w-full bg-slate-700 rounded-full h-1.5 mb-3 overflow-hidden">
          <div className="h-1.5 bg-green-400 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
        </div>
 
        <h2 className="text-lg font-bold mb-0.5">{activeStep?.label}</h2>
        <p className="text-slate-400 text-sm">{activeStep?.instruction}</p>
 
        {/* Soak micro-progress */}
        {isSoakStep && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Round</span>
              <span>{soakRound}/7</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${soakProgress}%` }} />
            </div>
          </div>
        )}
 
        {/* Look micro-progress */}
        {activeStep?.type === 'look' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Reps</span>
              <span>{repCount}/{activeStep.target}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${(repCount / activeStep.target) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
 
      {/* ── Toolbar (font size + audio mode) ── */}
      <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-b border-gray-100">
        {/* Font size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">A</span>
          <button
            onClick={() => setFontSize((s) => Math.max(MIN_FONT, s - 2))}
            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <Minus size={10} />
          </button>
          <button
            onClick={() => setFontSize((s) => Math.min(MAX_FONT, s + 2))}
            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <Plus size={10} />
          </button>
          <span className="text-xs text-gray-500 font-bold">A</span>
        </div>
 
        {/* Audio mode toggle */}
        {isSoakStep && (
          <button
            onClick={() => setAudioMode((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              audioMode
                ? 'bg-green-600 text-white border-green-700'
                : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'
            }`}
          >
            {audioMode ? <Volume2 size={11} /> : <VolumeX size={11} />}
            {audioMode ? 'Tap to hear' : 'Silent mode'}
          </button>
        )}
      </div>
 
      {/* ── Ayat display ── */}
      <div
        className={`px-5 py-5 flex flex-col gap-6 transition-all duration-500 ${
          isBlindStep && !revealed ? 'opacity-10 select-none blur-sm pointer-events-none' : 'opacity-100'
        }`}
      >
        {isSoakStep ? (
          // ── SOAK: word-by-word, sequential locking ─────────────────────────
          activeAyat.map((ayah, ayahIdx) => {
            const words = ayah.text_uthmani?.split(' ').filter(Boolean) || []
            const ayahDone = words.every((_, wi) => clickedWords.has(`${ayahIdx}:${wi}`))
 
            return (
              <div key={`${ayah.verse_key}-${soakRound}`} className={ayahIdx > 0 && !activeAyat.slice(0, ayahIdx).every((a, ai) => {
                const wc = a.text_uthmani?.split(' ').filter(Boolean).length || 0
                return Array.from({ length: wc }, (_, wi) => clickedWords.has(`${ai}:${wi}`)).every(Boolean)
              }) ? 'opacity-40 pointer-events-none' : ''}>
                {/* Translation — always first */}
                <p
                  className="text-center text-gray-700 mb-3 leading-relaxed"
                  style={{ fontFamily: 'Crimson Pro, serif', fontSize: `${translationSize}px`, fontStyle: 'italic' }}
                >
                  {ayah.translation}
                </p>
 
                {/* Arabic words — sequential lock */}
                <div className="flex flex-wrap gap-2 justify-center" style={{ direction: 'rtl' }}>
                  {words.map((word, wi) => {
                    const id      = `${ayahIdx}:${wi}`
                    const done    = clickedWords.has(id)
                    const locked  = !done && isWordLocked(ayahIdx, wi)
                    const mClass  = getWordMasteryClasses(wordMastery, word)
 
                    return (
                      <button
                        key={wi}
                        onClick={() => !done && !locked && handleWordTap(ayahIdx, wi, word)}
                        disabled={locked}
                        className={`px-3 py-2 rounded-xl border-2 transition-all select-none ${
                          done
                            ? 'bg-green-500 border-green-600 text-white scale-95'
                            : locked
                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                            : mClass.includes('green')
                            ? 'bg-green-50 border-green-300 text-green-800 hover:scale-105'
                            : mClass.includes('amber')
                            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:scale-105'
                            : 'bg-white border-gray-200 text-slate-800 hover:border-green-400 hover:scale-105'
                        }`}
                        style={{ fontFamily: 'Amiri, serif', fontSize: `${fontSize}px` }}
                      >
                        {word}
                      </button>
                    )
                  })}
                </div>
 
                {/* Verse number */}
                <div className="text-right mt-2">
                  <span className="text-xs text-green-600 border border-green-200 bg-green-50 rounded-full px-2 py-0.5">
                    {ayah.verse_number}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          // ── LOOK / BLIND: standard display ─────────────────────────────────
          activeAyat.map((ayah) => (
            <div key={ayah.verse_key}>
              {/* Translation always first */}
              <p
                className="text-center text-gray-700 mb-3 leading-relaxed"
                style={{ fontFamily: 'Crimson Pro, serif', fontSize: `${translationSize}px`, fontStyle: 'italic' }}
              >
                {ayah.translation}
              </p>
 
              {/* Arabic + play button */}
              <div className="flex items-start gap-2">
                {ayah.audioUrl && (
                  <button
                    onClick={() => playAyahAudio(ayah.verse_key)}
                    className={`flex-shrink-0 mt-1 p-1.5 rounded-lg transition-colors ${
                      playingKey === ayah.verse_key
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Volume2 size={14} />
                  </button>
                )}
                <div className="flex-1 text-right">
                  <p
                    className="leading-loose"
                    style={{ fontFamily: 'Amiri, serif', fontSize: `${fontSize}px`, direction: 'rtl', lineHeight: 2.2 }}
                  >
                    {ayah.text_uthmani?.split(' ').filter(Boolean).map((word, wi) => {
                      const mc       = getWordMasteryClasses(wordMastery, word)
                      const colored  = !!wordMastery[word]
                      return (
                        <span key={wi} className={colored ? `mx-0.5 px-0.5 rounded ${mc}` : ''}>
                          {word}{' '}
                        </span>
                      )
                    })}
                  </p>
                  <span className="inline-block text-xs text-green-600 border border-green-200 bg-green-50 rounded-full px-2 py-0.5 mt-1" style={{ direction: 'ltr' }}>
                    {ayah.verse_number}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
 
      {/* ── Controls ── */}
      <div className="px-5 pb-5 bg-slate-50 border-t border-gray-100 pt-4 space-y-3">
 
        {/* Soak: single Rep Done button + hint */}
        {isSoakStep && (
          <>
            <p className="text-xs text-center text-gray-400">
              {!allWordsClicked
                ? `Tap each word in order — next: ${nextWordLabel() || '…'} (${clickedWords.size}/${totalSectionWords})`
                : `All words read — round ${soakRound + 1} of 7 complete`}
            </p>
            <button
              onClick={handleSoakRoundDone}
              disabled={!allWordsClicked}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${
                allWordsClicked
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Round {soakRound + 1} Done ✓
            </button>
            <button
              onClick={handleSkipToBlind}
              className="w-full py-2 rounded-xl border border-gray-200 text-gray-400 text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
            >
              <SkipForward size={13} />
              Skip soak — go straight to recording
            </button>
          </>
        )}
 
        {/* Look steps: tap-count dots */}
        {activeStep?.type === 'look' && (
          <ProgressDots target={activeStep.target} current={repCount} onTap={handleRepTap} />
        )}
 
        {/* Blind step */}
        {isBlindStep && (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-xs text-slate-500 text-center">
              You have 5 minutes to recite from memory.
            </p>
 
            {!revealed && (
              <>
                <RecordingTimer isRecording={isRecording} onTimeUp={handleTimeUp} />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                    isRecording ? 'bg-red-500 shadow-red-200 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {isRecording ? <Square size={22} /> : <Mic size={22} />}
                </button>
                {!isRecording && !audioURL && (
                  <p className="text-xs text-gray-400 text-center">
                    Tap the mic, recite from memory, then stop to reveal.
                  </p>
                )}
                {isRecording && (
                  <p className="text-xs text-red-400 animate-pulse">Recording… tap to stop</p>
                )}
              </>
            )}
 
            {revealed && (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3">
                  <CheckCircle size={14} />
                  <span className="font-medium">Text revealed — check your accuracy</span>
                </div>
                {audioURL && (
                  <audio controls src={audioURL} className="w-full h-10 rounded-xl" />
                )}
              </div>
            )}
          </div>
        )}
 
        {/* Encouragement */}
        {encouragement && (
          <p className="text-center text-sm text-green-700 font-medium animate-slide-up">{encouragement}</p>
        )}
 
        {/* Mark as Mastered */}
        {isBlindStep && revealed && !masterClicked && (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: '#58CC02', boxShadow: '0 4px 0 #45a800' }}
          >
            <CheckCircle size={18} />
            Mark as Mastered
          </button>
        )}
 
        {masterClicked && (
          <div className="w-full py-4 text-center">
            <CheckCircle size={32} className="mx-auto text-green-500 mb-1" />
            <p className="text-green-700 font-bold">Mastered! Moving on…</p>
          </div>
        )}
 
        {/* Next step (look) */}
        {activeStep?.type === 'look' && (
          <div className="flex gap-2">
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`flex-1 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                canProceed ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'
              }`}
              style={canProceed ? { background: '#1F6F5B', boxShadow: '0 4px 0 #154D3F' } : { background: '#9ca3af' }}
            >
              {currentStep === totalSteps - 2 ? 'Go to Blind Test' : 'Next'}
              <ChevronRight size={18} />
            </button>
            <button
              onClick={handleSkipToBlind}
              className="px-3 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <SkipForward size={14} />
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
 
// ─── Step sequence builder ────────────────────────────────────────────────────
 
function buildSteps(ayat) {
  if (!ayat?.length) return []
 
  const steps = [
    {
      label:       'Initial Soak',
      instruction: 'Tap every word in order, 7 rounds. Complete the whole section each round.',
      target:      7,
      type:        'soak',
      ayatIndices: ayat.map((_, i) => i),
    },
  ]
 
  // Chain repetitions: single ayah × 3, then pairs × 3
  for (let i = 0; i < ayat.length; i++) {
    steps.push({
      label:       `Verse ${ayat[i].verse_number}`,
      instruction: `Recite verse ${ayat[i].verse_number} three times.`,
      target:      3,
      type:        'look',
      ayatIndices: [i],
    })
    if (i > 0) {
      steps.push({
        label:       `Verses ${ayat[i - 1].verse_number} + ${ayat[i].verse_number}`,
        instruction: `Recite both together, 3 times.`,
        target:      3,
        type:        'look',
        ayatIndices: [i - 1, i],
      })
    }
  }
 
  // Final whole-section polish
  steps.push({
    label:       'Final Polish',
    instruction: 'Recite the whole section 3 times to lock it in.',
    target:      3,
    type:        'look',
    ayatIndices: ayat.map((_, i) => i),
  })
 
  // Blind test
  steps.push({
    label:       'Blind Test',
    instruction: 'Record from memory. Text is hidden until you stop.',
    target:      1,
    type:        'blind',
    ayatIndices: ayat.map((_, i) => i),
  })
 
  return steps
}