import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Create ZAI instance (works on Vercel)
    const zai = await ZAI.create()

    // System prompt
    const systemPrompt = `You are MediMate AI, an advanced medical education assistant for MEDICORE ACADEMY powered by GLM-4.7.

CRITICAL LANGUAGE RULES:
1. ALWAYS respond in the EXACT SAME LANGUAGE the user writes in
2. Support 50+ languages fluently:
   - Kurdish Sorani (کوردی سۆرانی) - respond in Kurdish
   - Arabic (العربية العراقية) - respond in Arabic  
   - Turkmani (ترکمانی) - respond in Turkmani
   - English, Spanish, French, German, etc.

MEDICAL EXPERTISE:
- Medical terminology & anatomy
- Clinical diagnosis & pathology  
- Pharmacology & drug interactions
- Study strategies & exam preparation
- Medical education at all levels

RESPONSE STYLE:
- Be educational, NOT clinical advice
- Always recommend consulting healthcare professionals
- Use bullet points and clear formatting
- Think deeply before answering
- Keep responses informative but concise

DETECT the user's language automatically and respond in that SAME language.`

    // Build messages
    const recentHistory = (history || []).slice(-8)
    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...recentHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ]

    // Call GLM via z-ai-web-dev-sdk
    const completion = await zai.chat.completions.create({ messages })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      return NextResponse.json({ error: 'Failed to generate response', retryable: true }, { status: 500 })
    }

    return NextResponse.json({ response })
    
  } catch (error) {
    console.error('MediMate AI error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('timeout')) {
      return NextResponse.json({ error: 'Response took too long. Try a shorter question.', retryable: true }, { status: 504 })
    }
    
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return NextResponse.json({ error: 'Connection failed. Please try again.', retryable: true }, { status: 503 })
    }
    
    return NextResponse.json({ error: 'An error occurred. Please try again.', retryable: true }, { status: 500 })
  }
}
