import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-OpenRouter-Title': 'Sakinah App',
  },
})

/**
 * Call OpenAI (via OpenRouter) chat completions.
 * @param {{ messages: Array<{role: string, content: string}>, temperature?: number, max_tokens?: number }} params
 * @returns {Promise<string>}
 */
export async function callOpenAI({ messages, temperature = 0.6, max_tokens = 300 }) {
  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages,
    temperature,
    max_tokens,
  })
  const content = response.choices?.[0]?.message?.content
  if (!content) throw new Error('No content returned from OpenAI')
  return content.trim()
}

export default openai
