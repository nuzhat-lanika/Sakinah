'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, RotateCcw } from 'lucide-react'

const QUICK_CHIPS = ['I feel overwhelmed lately', 'This gives me hope', 'I struggle with this', 'Tell me more']

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Peace be upon you. This verse speaks directly to the human experience of hardship and relief. What comes to mind when you read it today — does anything in your life feel connected to this meaning?',
}

export default function Chat({ verse, translation, tafsir, memory, userId, onReflection }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [chipsVisible, setChipsVisible] = useState(true)
  const bottomRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!userId) {
      const saved = localStorage.getItem('sakinah_chat')
      if (saved) { try { const p = JSON.parse(saved); if (p.length > 1) setMessages(p) } catch {} }
    }
  }, [userId])

  useEffect(() => {
    if (!userId) localStorage.setItem('sakinah_chat', JSON.stringify(messages))
  }, [messages, userId])

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported. Try Chrome.'); return }
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = (e) => setInput((prev) => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript)
    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false) }

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')
    setChipsVisible(false)
    setLoading(true)
    const userMsg = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.slice(-12), verse, translation, tafsir, memory: memory || null }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text || 'Something went wrong. Please try again.' }])
      onReflection?.(userText)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'A connection issue occurred. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => { setMessages([INITIAL_MESSAGE]); setChipsVisible(true); setInput(''); localStorage.removeItem('sakinah_chat') }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center text-white font-medium text-sm">س</div>
          <div>
            <p className="text-sm font-medium text-gray-800">Sakinah</p>
            <p className="text-xs text-gray-400">Your reflection companion</p>
          </div>
        </div>
        <button onClick={resetChat} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><RotateCcw size={14} /></button>
      </div>
      <div className="flex flex-col gap-3 p-4 min-h-[220px] max-h-[340px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-green-700 text-white self-end rounded-br-sm' : 'bg-gray-50 text-gray-800 self-start rounded-bl-sm border border-gray-100'}`} style={{ fontFamily: msg.role === 'assistant' ? 'Crimson Pro, serif' : undefined, fontSize: msg.role === 'assistant' ? '15px' : '14px' }}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="self-start bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {chipsVisible && (
        <div className="flex gap-2 flex-wrap px-4 pb-2">
          {QUICK_CHIPS.map((chip) => (
            <button key={chip} onClick={() => sendMessage(chip)} className="px-3 py-1 text-xs rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-green-400 hover:bg-green-50 hover:text-green-700 transition-colors">{chip}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2 p-4 pt-2 border-t border-gray-100">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Write your reflection…" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-gray-800 placeholder-gray-400" />
        <button onClick={listening ? stopVoice : startVoice} className={`p-2 rounded-xl transition-colors ${listening ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="p-2 rounded-xl bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
