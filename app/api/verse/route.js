import { NextResponse } from 'next/server'
import { getRandomVerse, getTafsir } from '@/lib/quranApi'

export const dynamic = 'force-dynamic'

const FALLBACK = {
  verse: {
    arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    verseKey: '94:6',
    surahName: 'Al-Inshirah',
    verseNumber: 6,
    chapterNumber: 94,
  },
  translation: 'Indeed, with hardship comes ease.',
  tafsir: 'Allah assures us that alongside every hardship, He has placed ease.',
  audioUrl: null,
}

export async function GET() {
  try {
    const verseData = await getRandomVerse()

    // IF VERSEDATA IS NULL: This means the fetchChapterBundle returned null 
    // because the core Arabic text couldn't be reached (Internet is down).
    if (!verseData) {
      return NextResponse.json(FALLBACK)
    }

    // Attempt Tafsir, but don't let it crash the route if it fails
    const tafsir = await getTafsir(verseData.verseKey).catch(() => "Tafsir loading...")

    return NextResponse.json({
      verse: {
        arabic:        verseData.arabic,
        verseKey:      verseData.verseKey,
        surahName:     verseData.surahName,
        verseNumber:   verseData.verseNumber,
        chapterNumber: verseData.chapterNumber,
      },
      translation: verseData.translation, // Will be "Translation loading..." if missing
      tafsir:      tafsir,               // Will be "Tafsir loading..." if missing
      audioUrl:    verseData.audioUrl,
    })
  } catch (error) {
    // This only triggers if there is a syntax error or major code crash
    console.error('[API /verse] Fatal crash:', error.message)
    return NextResponse.json(FALLBACK)
  }
}