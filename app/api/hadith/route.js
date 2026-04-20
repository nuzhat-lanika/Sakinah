import { NextResponse } from 'next/server'
import { getTodayHadith } from '@/lib/hadith'

export async function GET() {
  try {
    const hadith = getTodayHadith()
    if (!hadith?.text || !hadith?.source) {
      return NextResponse.json({ text: "The best among you are those who have the best manners and character.", source: "Sahih Al-Bukhari" })
    }
    return NextResponse.json(hadith)
  } catch (error) {
    return NextResponse.json({ text: "The best among you are those who have the best manners and character.", source: "Sahih Al-Bukhari" }, { status: 500 })
  }
}
