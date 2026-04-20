import { NextResponse } from 'next/server'
import { callOpenAI } from '@/lib/openai'
import { buildImpactQuoteMessages } from '@/lib/promptBuilder'

export async function POST(req) {
  try {
    const body = await req.json()
    const { verse, translation, verseKey } = body

    if (!verse || !translation) {
      return NextResponse.json({ error: 'Missing verse or translation' }, { status: 400 })
    }

    const messages = buildImpactQuoteMessages({ verse, translation, verseKey: verseKey || '' })

    const text = await callOpenAI({
      messages,
      temperature: 0.8,
      max_tokens: 100,
    })

    // Split into exactly 2 lines
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const line1 = lines[0] || 'Every hardship carries within it the seed of its own relief.'
    const line2 = lines[1] || 'Today, name one difficulty and find the gift hidden inside it.'

    return NextResponse.json({ line1, line2 })
  } catch (error) {
    console.error('[API /impact-quote] Error:', error.message)
    return NextResponse.json(
      {
        line1: 'The Qur\'an does not ask you to be strong. It reminds you that you already are.',
        line2: 'Carry this verse with you today and let it answer the hardest moment.',
      },
      { status: 500 }
    )
  }
}
