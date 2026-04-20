import { AI_PERSONALITY, buildPersonalityContext } from './personality.js'

export function buildPrompt({ task, context, memory }) {
  const personalityContext = buildPersonalityContext(memory)
  const systemContent = [AI_PERSONALITY, personalityContext, `TASK:\n${task}`, `CONTEXT:\n${context}`]
    .filter(Boolean)
    .join('\n\n')
  return [{ role: 'system', content: systemContent }]
}

export function buildCoachMessages({ verse, translation, tafsir, history, memory }) {
  const systemMessages = buildPrompt({
    task: "Guide the user through deep, personal reflection on the Qur'anic verse. Ask thoughtful questions. Do not give lectures.",
    context: [`Verse (Arabic): ${verse}`, `Translation: ${translation}`, tafsir ? `Tafsir context: ${tafsir}` : ''].filter(Boolean).join('\n'),
    memory,
  })
  const safeHistory = (history || []).map((m) => ({
    role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content || m.text || '',
  }))
  return [...systemMessages, ...safeHistory]
}

export function buildGrammarMessages({ verseArabic }) {
  return [
    {
      role: 'system',
      content: `${AI_PERSONALITY}

You are also an expert in Qur'anic Arabic grammar.
Break down the verse word-by-word.
Return ONLY valid JSON — no prose, no markdown fences.
Format:
[
  {
    "word": "<Arabic word>",
    "transliteration": "<romanized>",
    "translation": "<English meaning>",
    "grammar": "<grammatical role in English>",
    "explanation": "<1-2 sentence explanation for a beginner>"
  }
]`,
    },
    { role: 'user', content: `Break down this verse: ${verseArabic}` },
  ]
}

/**
 * Build messages for impact quote generation.
 * Returns a 2-line motivational insight grounded in the verse.
 */
export function buildImpactQuoteMessages({ verse, translation, verseKey }) {
  return [
    {
      role: 'system',
      content: `You are a Qur'anic wisdom coach. Your job is to generate a powerful, 2-line motivational insight based on the verse provided.

Rules:
- Exactly 2 lines. No more, no less.
- Line 1: A bold, direct insight derived from the verse meaning. Make it feel like a revelation.
- Line 2: A practical, personal application for today. Ground it in real life.
- No quotes, no attribution, no "this verse means..."
- Write in second person ("you", "your").
- Be poetic but not abstract. Be direct but not blunt.
- Maximum 20 words per line.
- Return ONLY the two lines, separated by a newline character. No JSON, no formatting.`,
    },
    {
      role: 'user',
      content: `Verse: "${translation}" (${verseKey})\nArabic: ${verse}`,
    },
  ]
}

export function buildInsightMessages({ reflections, themes, emotionLog, streak }) {
  return [
    {
      role: 'system',
      content: `${AI_PERSONALITY}

You are analyzing a user's Qur'anic reflection patterns over time.
Return ONLY valid JSON with this exact shape:
{
  "dominant_themes": ["<theme1>", "<theme2>"],
  "emotional_trend": "<short phrase like anxious → reflective>",
  "growth_signal": "<what positive shift is happening, 1 sentence>",
  "key_struggle": "<what the user is genuinely dealing with, 1 sentence>",
  "quranic_connection": "<connect their pattern to a general Qur'anic principle, 1 sentence>",
  "insight": "<2-3 sentence deeply personal reflection>",
  "action_step": "<1 simple realistic step for tomorrow>"
}`,
    },
    {
      role: 'user',
      content: `Reflections:\n${(reflections || []).join('\n')}\n\nThemes: ${JSON.stringify(themes)}\nEmotional log: ${(emotionLog || []).map((e) => e.emotion).join(' → ')}\nStreak: ${streak} days`,
    },
  ]
}
