import { NextResponse } from 'next/server'
import { callOpenAI } from '@/lib/openai'
import { buildGrammarMessages } from '@/lib/promptBuilder'

export async function POST(req) {
  try {
    const body = await req.json()
    const { verseArabic } = body

    if (!verseArabic) {
      return NextResponse.json({ error: 'Missing verseArabic' }, { status: 400 })
    }

    const messages = buildGrammarMessages({ verseArabic })
    const text = await callOpenAI({ messages, temperature: 0.3, max_tokens: 800 })
    const cleaned = text.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        throw new Error('Could not parse grammar JSON')
      }
    }

    return NextResponse.json({ analysis: parsed })
  } catch (error) {
    console.error('[API /grammar] Error:', error.message)
    return NextResponse.json({ error: 'Grammar analysis failed', analysis: [] }, { status: 500 })
  }
}
