import { NextResponse } from 'next/server'
import { callOpenAI } from '@/lib/openai'
import { buildInsightMessages } from '@/lib/promptBuilder'

export async function POST(req) {
  try {
    const body = await req.json()
    const { reflections, themes, emotionLog, streak } = body
    const messages = buildInsightMessages({ reflections: reflections || [], themes: themes || {}, emotionLog: emotionLog || [], streak: streak || 0 })
    const text = await callOpenAI({ messages, temperature: 0.7, max_tokens: 500 })
    const cleaned = text.replace(/```json|```/g, '').trim()
    let parsed
    try { parsed = JSON.parse(cleaned) } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { dominant_themes: [], emotional_trend: 'reflective', growth_signal: 'Your consistent engagement shows a genuine desire to connect.', key_struggle: 'Finding stillness amid daily demands.', quranic_connection: "The Qur'an consistently honors those who pause and reflect.", insight: 'Each reflection you write is a step toward greater self-awareness.', action_step: 'Tomorrow, read one verse slowly before beginning your day.' }
    }
    return NextResponse.json({ insight: parsed })
  } catch (error) {
    console.error('[API /insights] Error:', error.message)
    return NextResponse.json({ insight: { dominant_themes: [], emotional_trend: 'reflective', growth_signal: 'Your engagement shows consistent spiritual curiosity.', key_struggle: 'Maintaining focus amid daily demands.', quranic_connection: "Reflection is encouraged throughout the Qur'an.", insight: 'Every session of reflection builds something lasting inside you.', action_step: 'Choose one verse that moved you today and carry it with you tomorrow.' } }, { status: 500 })
  }
}
