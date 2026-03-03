'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage, translations } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { 
  Bot, 
  Send, 
  Loader2, 
  User, 
  Sparkles, 
  Brain, 
  Minimize2, 
  Stethoscope,
  Activity,
  Heart,
  MessageCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

interface MediMateAIProps {
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function MediMateAI({ isExpanded: externalExpanded, onToggleExpand }: MediMateAIProps) {
  const { language } = useLanguage()
  const { resolvedTheme } = useTheme()
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Welcome to MEDICORE ACADEMY!

I'm **MediMate AI**, your multilingual medical education assistant powered by GLM-4.7.

🌍 I speak 50+ languages including:
• English • Kurdish Sorani (کوردی سۆرانی)
• العربية العراقية • ترکمانی
• Español • Français • Deutsch
• And 40+ more languages!

📚 I can help you with:
• Medical terminology & anatomy
• Clinical diagnosis & pathology
• Pharmacology & drug interactions
• Study strategies & exam prep

🧠 I think deeply before answering to give you the best educational responses.

**Ask me anything in your preferred language!**`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(externalExpanded || false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Translation helper
  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    return translation[language] || translation.en || key
  }

  // Theme-based styling
  const isDark = resolvedTheme === 'dark'
  const bgCard = isDark ? 'bg-slate-800' : 'bg-slate-100'
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200'
  const textPrimary = isDark ? 'text-white' : 'text-slate-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const inputBg = isDark ? 'bg-slate-800' : 'bg-slate-50'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (externalExpanded !== undefined) {
      setIsExpanded(externalExpanded)
    }
  }, [externalExpanded])

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onToggleExpand?.()
  }

  // Call Puter.js via local in-browser client when available (no external endpoints or tokens).
  // If Puter.js is not usable in the current environment, fall back to the internal `/api/chat` route
  // which already routes to GLM-4.7 server-side. This keeps everything in-app and avoids external links.
  const callPuterAI = async (messages: Array<{role: string; content: string}>): Promise<string> => {
    try {
      const puterModule: any = await import('@heyputer/puter.js')

      // Try common entrypoints supported by different puter.js versions.
      // We keep calls guarded to avoid runtime errors if the package shape differs.
      if (puterModule?.createPuter) {
        const puter = await puterModule.createPuter()
        if (puter?.chat?.completions?.create) {
          const completion = await puter.chat.completions.create({ messages, model: 'glm-4.7' })
          return completion?.choices?.[0]?.message?.content ?? completion?.content ?? JSON.stringify(completion)
        }
        if (puter?.call) {
          const resp = await puter.call({ driver: 'glm', model: 'glm-4.7', method: 'chat', messages })
          return resp?.content ?? resp?.text ?? JSON.stringify(resp)
        }
      }

      // Some versions export a default object with `.chat` helper
      const puterDefault = puterModule?.default ?? puterModule
      if (puterDefault) {
        if (puterDefault?.chat?.completions?.create) {
          const completion = await puterDefault.chat.completions.create({ messages, model: 'glm-4.7' })
          return completion?.choices?.[0]?.message?.content ?? completion?.content ?? JSON.stringify(completion)
        }
        if (puterDefault?.chat) {
          const resp = await puterDefault.chat({ messages, model: 'glm-4.7' })
          return resp?.text ?? resp?.content ?? JSON.stringify(resp)
        }
      }

      // If we reach here, the puter module didn't expose a compatible API.
      throw new Error('Puter client available but no compatible chat API found')
    } catch (err) {
      // If import or calls fail, bubble up to let caller fallback to other internal options.
      console.warn('Puter client unavailable or incompatible:', err)
      throw err
    }
  }

  // Use z-ai-web-dev-sdk as fallback (works reliably)
  const callZAI = async (messages: Array<{role: string; content: string}>): Promise<string> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: messages[messages.length - 1].content, 
        history: messages.slice(1, -1) 
      })
    })

    if (!response.ok) {
      throw new Error('AI service error')
    }

    const data = await response.json()
    return data.response
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // System prompt
      const systemPrompt = `You are MediMate AI, an advanced medical education assistant for MEDICORE ACADEMY powered by GLM-4.7.

KEY RULES:
1. ALWAYS respond in the SAME LANGUAGE the user writes in
2. Support 50+ languages including Kurdish (کوردی سۆرانی), Arabic (العربية), Turkmani (ترکمانی), English, Spanish, French
3. Help with: medical terminology, anatomy, clinical diagnosis, pharmacology, study strategies
4. Be educational, NOT clinical advice - always recommend consulting healthcare professionals
5. Think deeply before answering
6. Use bullet points and formatting for clarity

Respond professionally in the user's language. Think step by step.`

      // Build messages
      const recentHistory = messages.filter(m => !m.isError).slice(-6)
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ]

      // Try calling AI
      let responseText = ''
      try {
        // Primary: Use backend API (z-ai-web-dev-sdk with GLM)
        responseText = await callZAI(chatMessages)
      } catch {
        // Fallback: Try Puter API directly
        try {
          responseText = await callPuterAI(chatMessages)
        } catch (fallbackError) {
          throw new Error('All AI services temporarily unavailable')
        }
      }

      if (!responseText) {
        throw new Error('Empty response from AI')
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${errorMessage}

Please try again in a moment.

ژمارەیەک کێشە هەیە. تکایە دووبارە هەوڵ بدەرەوە.`,
          isError: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      setMessages((prev) => prev.filter((_, i) => i < prev.length - 1))
      setInput(lastUserMessage.content)
    }
  }

  // Quick actions
  const quickActions = [
    { icon: Brain, text: 'Pathophysiology', query: 'Explain the pathophysiology of heart failure' },
    { icon: Stethoscope, text: 'Clinical', query: 'How to approach clinical case analysis?' },
    { icon: Activity, text: 'Study Tips', query: 'Best study strategies for medical students' },
    { icon: Heart, text: 'Anatomy', query: 'Explain human heart anatomy with clinical correlations' },
  ]

  // Collapsed view
  if (!isExpanded) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-4">
        <Button
          onClick={handleToggle}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all hover:scale-105"
        >
          <MessageCircle className="w-8 h-8" />
        </Button>
        <p className={`text-xs ${textSecondary} mt-3 text-center`}>
          Click to chat<br />MediMate AI
        </p>
      </div>
    )
  }

  // Expanded view
  return (
    <div className="flex flex-col h-[450px]">
      {/* Header */}
      <div className={`flex items-center justify-between mb-3 pb-3 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${loading ? 'bg-gradient-to-br from-amber-500 to-orange-500 animate-pulse' : 'bg-gradient-to-br from-teal-500 to-emerald-500'}`}>
            {loading ? <Activity className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-white" />}
          </div>
          <div>
            <h4 className={`font-bold ${textPrimary} text-sm`}>MediMate AI</h4>
            <p className={`text-xs ${textSecondary}`}>{loading ? 'Thinking...' : 'GLM-4.7 Ready'}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleToggle} className={`h-8 w-8 p-0 ${textSecondary} hover:text-white`}>
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ${message.isError ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-teal-500 to-emerald-500'}`}>
                {message.isError ? <AlertTriangle className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
            )}
            <Card className={`max-w-[85%] ${message.role === 'user' ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white border-transparent' : message.isError ? 'bg-amber-500/10 border-amber-500/30' : `${bgCard} ${borderColor}`}`}>
              <CardContent className={`p-3 text-sm ${message.role === 'assistant' ? message.isError ? 'text-amber-200' : textPrimary : 'text-white'}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.isError && (
                  <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2 h-7 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                    <RefreshCw className="w-3 h-3 mr-1" />Retry
                  </Button>
                )}
              </CardContent>
            </Card>
            {message.role === 'user' && (
              <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-300'} flex items-center justify-center flex-shrink-0`}>
                <User className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <Card className={`${bgCard} ${borderColor}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  <span className={`text-sm ${textSecondary}`}>Thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {quickActions.map((action, index) => (
            <Button key={index} variant="outline" size="sm" onClick={() => setInput(action.query)} className={`h-auto py-1.5 px-2 text-xs ${borderColor} ${textSecondary} hover:text-teal-400 hover:border-teal-500/50`}>
              <action.icon className="w-3 h-3 mr-1" />{action.text}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type in any language..." className={`${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500 h-10`} disabled={loading} />
        <Button onClick={handleSend} disabled={loading || !input.trim()} className="h-10 w-10 p-0 bg-gradient-to-br from-teal-500 to-emerald-500 text-white" size="icon">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Badge */}
      <div className={`flex items-center justify-center gap-1.5 mt-2 text-xs ${textSecondary}`}>
        <Sparkles className="w-3 h-3 text-teal-500" />
        <span>Powered by GLM-4.7 • Multilingual AI</span>
      </div>
    </div>
  )
}
