'use client'

import { useState, useRef } from 'react'
import { Bookmark, Volume2, Share2, RefreshCw, RotateCcw } from 'lucide-react'

export default function VerseCard({
  verse,
  translation,
  tafsir,
  audioUrl,
  surahName,
  verseKey,
  onBookmark,
  onRefresh,
  loading
}) {
  const [flipped, setFlipped] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const audioRef = useRef(null)

  const handleBookmark = () => {
    setBookmarked(true)
    onBookmark?.()
    setTimeout(() => setBookmarked(false), 2000)
  }

  const handleAudio = () => {
    if (!audioUrl) return

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setPlaying(false)
    }

    if (playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  if (loading) {
    return (
      <div className="bg-green-700 rounded-2xl p-6 h-56 animate-pulse" />
    )
  }

  return (
    <div
      className="bg-green-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer perspective"
      onClick={() => setFlipped(!flipped)}
    >
      {/* background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

      <div
        className={`relative z-10 transition-transform duration-500 transform-style-preserve-3d ${
          flipped ? 'rotate-y-180' : ''
        }`}
      >

        {/* FRONT SIDE */}
        <div className="backface-hidden text-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium tracking-widest uppercase text-white/60">
              Verse of the Day
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onRefresh?.()
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <p
            className="leading-loose mb-4"
            style={{
              fontFamily: 'Amiri, serif',
              fontSize: '28px',
              direction: 'rtl'
            }}
          >
            {verse}
          </p>

          <p className="text-white/50 text-xs">
            {surahName} · {verseKey}
          </p>

          <p className="text-white/40 text-xs mt-4">
            Tap to see meaning
          </p>
        </div>

        {/* BACK SIDE */}
        <div
          className="absolute inset-0 rotate-y-180 backface-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-white/85 text-center mb-2"
            style={{
              fontFamily: 'Crimson Pro, serif',
              fontSize: '17px',
              fontStyle: 'italic'
            }}
          >
            {translation || 'Translation loading...'}
          </p>

          {tafsir ? (
            <p className="text-white/70 text-sm leading-relaxed border-t border-white/10 pt-3 mb-4">
              {tafsir}
            </p>
          ) : (
            <p className="text-white/40 text-sm border-t border-white/10 pt-3 mb-4">
              No tafsir available
            </p>
          )}

          <p className="text-white/50 text-xs text-center mb-4">
            Reflection + Meaning
          </p>

          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAudio()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm"
            >
              <Volume2 size={14} />
              {playing ? 'Stop' : 'Listen'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleBookmark()
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                bookmarked
                  ? 'bg-amber-400/30 text-amber-200'
                  : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              <Bookmark size={14} />
              {bookmarked ? 'Saved!' : 'Bookmark'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                navigator.share?.({
                  text: `${verse}\n\n"${translation}"\n— ${surahName} ${verseKey}`
                })
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm"
            >
              <Share2 size={14} />
              Share
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setFlipped(false)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              <RotateCcw size={14} />
              Flip back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}