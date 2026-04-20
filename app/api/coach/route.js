import { NextResponse } from 'next/server'
import { callOpenAI } from '@/lib/openai'
import { buildCoachMessages } from '@/lib/promptBuilder'

export async function POST(req) {
  try {
    const body = await req.json()
    const { messages, verse, translation, tafsir, memory } = body

    if (!messages || !verse) {
      return NextResponse.json({ error: 'Missing required fields: messages, verse' }, { status: 400 })
    }

    const prompt = buildCoachMessages({ verse, translation: translation || '', tafsir: tafsir || null, history: messages, memory: memory || null })
    const text = await callOpenAI({ messages: prompt, temperature: 0.65, max_tokens: 200 })
    const sentences = text.split(/(?<=[.?!])\s+/)
    const capped = sentences.slice(0, 4).join(' ')

    return NextResponse.json({ text: capped })
  } catch (error) {
    console.error('[API /coach] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to generate response', text: 'Something prevented a response. Please try sharing your thoughts again.' },
      { status: 500 }
    )
  }
}
