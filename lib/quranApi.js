/**
 * lib/quranApi.js - Resilient Version
 */

const BASE = 'https://api.quran.com/api/v4'
const _bundleCache = new Map()
 
export async function fetchChapterBundle(chapterNumber, reciterId = 1) {
  const cacheKey = `${chapterNumber}:${reciterId}`
  if (_bundleCache.has(cacheKey)) return _bundleCache.get(cacheKey)
 
  // Use allSettled so one failed request doesn't kill the whole bundle
  const [versesRes, translationsRes, audioRes, chapterRes] = await Promise.allSettled([
    fetch(`${BASE}/quran/verses/uthmani?chapter_number=${chapterNumber}&per_page=300`),
    fetch(`${BASE}/quran/translations/131?chapter_number=${chapterNumber}&per_page=300`),
    fetch(`${BASE}/recitations/${reciterId}/by_chapter/${chapterNumber}`),
    fetch(`${BASE}/chapters/${chapterNumber}`),
  ])
 
  // Verses: The critical part. If this fails, we return null to trigger the Fallback
  let verses = []
  if (versesRes.status === 'fulfilled' && versesRes.value.ok) {
    const j = await versesRes.value.json()
    verses = j.verses || []
  } else {
    // If the core Arabic text is missing, the internet is likely down
    return null 
  }
 
  const translationMap = new Map()
  if (translationsRes.status === 'fulfilled' && translationsRes.value.ok) {
    const j = await translationsRes.value.json()
    ;(j.translations || []).forEach((t) => {
      const text = (t.text || '').replace(/<[^>]*>/g, '').trim()
      if (t.verse_key) translationMap.set(t.verse_key, text)
    })
  }
 
  const audioMap = new Map()
  if (audioRes.status === 'fulfilled' && audioRes.value.ok) {
    const j = await audioRes.value.json()
    ;(j.audio_files || []).forEach((a) => {
      if (a.verse_key) audioMap.set(a.verse_key, `https://verses.quran.com/${a.url}`)
    })
  }
 
  let chapterInfo = { name_simple: `Surah ${chapterNumber}` }
  if (chapterRes.status === 'fulfilled' && chapterRes.value.ok) {
    const j = await chapterRes.value.json()
    chapterInfo = j.chapter || chapterInfo
  }
 
  const bundle = { verses, translationMap, audioMap, chapterInfo }
  _bundleCache.set(cacheKey, bundle)
  return bundle
}
 
export async function getChunkAyat(chapterNumber, startAyah, endAyah) {
  const bundle = await fetchChapterBundle(chapterNumber)
  // If bundle is null (internet down), return empty array so UI can show "Offline"
  if (!bundle) return []
 
  const { verses, translationMap, audioMap } = bundle
  return verses.slice(startAyah - 1, endAyah).map((v) => ({
    verse_key:    v.verse_key,
    verse_number: v.verse_number,
    text_uthmani: v.text_uthmani,
    // FALLBACK STRINGS inside the data instead of crashing
    translation:  translationMap.get(v.verse_key) || 'Translation loading...',
    audioUrl:     audioMap.get(v.verse_key) || null,
    surah_number: chapterNumber,
  }))
}
 
export async function getRandomVerse() {
  const chapterNumber = Math.floor(Math.random() * 114) + 1
  const bundle = await fetchChapterBundle(chapterNumber)
  
  // If the internet is down, fetchChapterBundle returns null
  if (!bundle) return null 

  const { verses, translationMap, audioMap, chapterInfo } = bundle
  const v = verses[Math.floor(Math.random() * verses.length)]
  const key = v.verse_key

  return {
    arabic:        v.text_uthmani,
    verseKey:      key,
    surahName:     chapterInfo.name_simple,
    verseNumber:   v.verse_number,
    chapterNumber,
    // Prioritize showing Arabic; indicate loading for translation
    translation:   translationMap.get(key) || 'Translation loading...',
    audioUrl:      audioMap.get(key) || null,
  }
}

export async function getTafsir(verseKey) {
  try {
    const res = await fetch(`${BASE}/quran/tafsirs/169?verse_key=${verseKey}`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    const raw = data.tafsirs?.[0]?.text || ''
    return raw.replace(/<[^>]*>/g, '').trim().slice(0, 600) + '...'
  } catch {
    // If Tafsir fails, return a string instead of null to prevent UI empty states
    return "Tafsir loading..."
  }
}