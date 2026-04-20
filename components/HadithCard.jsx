'use client'

import { useState, useEffect } from 'react'

export default function HadithCard() {
  const [hadith, setHadith] = useState(null)

  useEffect(() => {
    fetch('/api/hadith')
      .then((r) => r.json())
      .then(setHadith)
      .catch(() => setHadith({ text: "The best among you are those who learn the Qur'an and teach it.", source: 'Sahih Al-Bukhari' }))
  }, [])

  if (!hadith) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
        <div className="h-4 bg-gray-100 rounded mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Hadith of the Day</p>
      <p className="text-gray-800 leading-relaxed mb-2" style={{ fontFamily: 'Crimson Pro, serif', fontSize: '15px' }}>
        &ldquo;{hadith.text}&rdquo;
      </p>
      <p className="text-xs text-gray-400">— {hadith.source}</p>
    </div>
  )
}
