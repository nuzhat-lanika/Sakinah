'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

export default function ImpactQuote({ verse, translation, verseKey, onXP }) {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!verse) return
    setLoading(true)
    try {
      const res = await fetch('/api/impact-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse, translation, verseKey }),
      })
      const data = await res.json()
      setQuote({ line1: data.line1, line2: data.line2 })
      onXP?.('IMPACT_QUOTE')
    } catch {
      setQuote({
        line1: "The Qur'an does not ask you to be strong. It reminds you that you already are.",
        line2: 'Carry this verse with you today and let it answer the hardest moment.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <Sparkles size={12} className="text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Impact Quote</span>
        </div>
        {quote && (
          <button
            onClick={generate}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="p-4">
        {!quote ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-gray-400 text-center">
              Get a 2-line insight from this verse.
            </p>
            <button
              onClick={generate}
              disabled={loading || !verse}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Insight
                </>
              )}
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 py-2">
            <div className="h-5 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 bg-gray-100 rounded animate-pulse w-4/5" />
          </div>
        ) : (
          <div className="space-y-3 animate-slide-up">
            {/* Line 1 — bold insight */}
            <p
              className="text-gray-900 leading-snug"
              style={{ fontFamily: 'Crimson Pro, serif', fontSize: '18px', fontWeight: 600 }}
            >
              {quote.line1}
            </p>
            {/* Line 2 — practical application */}
            <p
              className="text-gray-500 leading-relaxed"
              style={{ fontFamily: 'Crimson Pro, serif', fontSize: '16px', fontStyle: 'italic' }}
            >
              {quote.line2}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
