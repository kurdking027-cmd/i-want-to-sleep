import { NextRequest, NextResponse } from 'next/server'
// Use Puter.js directly for GLM-4.7 inference on the server
// this ensures the deployed MediMate AI always uses the intended model
// without relying on external service libraries.

// Note: we import dynamically below to avoid potential build-time issues
// in environments where the package might not be available.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // ensure server has Puter credentials; without this GLM-4.7 cannot be
    // accessed. Set PUTER_API_KEY in your deployment environment (Vercel
    // project settings) to a valid token.  If missing, we return a clear error,
    // avoiding confusing HTML responses.
    if (!process.env.PUTER_API_KEY) {
      return NextResponse.json({
        error: 'Server not configured: PUTER_API_KEY environment variable is missing'
      }, { status: 500 })
    }

    // Choose Puter.js for model inference
    // We dynamically import the package so builds succeed even if the
    // module isn't installed; falling back to generic require style.
    const puterPackage: any = await import('@heyputer/puter.js').catch(err => {
      console.error('failed to import puter.js', err)
      throw new Error('AI backend unavailable')
    })

    let puter: any
    if (puterPackage?.createPuter) {
      puter = await puterPackage.createPuter()
    } else if (puterPackage?.default?.createPuter) {
      puter = await puterPackage.default.createPuter()
    } else {
      // maybe the module exports chat directly
      puter = puterPackage.default ?? puterPackage
    }

    // allow configuration via environment variable; Vercel project settings
    // should define PUTER_API_KEY (or whatever name fits) so server can
    // authenticate to Puter service.
    if (puter && typeof process !== 'undefined' && process.env.PUTER_API_KEY) {
      try {
        if (puter.setAuthToken) puter.setAuthToken(process.env.PUTER_API_KEY)
        else puter.authToken = process.env.PUTER_API_KEY
      } catch (tokenErr) {
        console.warn('Failed to set Puter auth token', tokenErr)
      }
    }

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

    // Call GLM-4.7 via puter
    let completion: any
    try {
      if (puter?.chat?.completions?.create) {
        completion = await puter.chat.completions.create({ messages, model: 'glm-4.7' })
      } else if (puter?.chat) {
        completion = await puter.chat({ messages, model: 'glm-4.7' })
      } else if (puter?.call) {
        completion = await puter.call({ driver: 'glm', model: 'glm-4.7', method: 'chat', messages })
      } else {
        throw new Error('No compatible puter chat interface found')
      }
    } catch (puterErr) {
      console.error('Puter.ai error:', puterErr)
      // do not attempt fallback; require valid PUTER_API_KEY and working
      // network to GLM-4.7. Respond with descriptive message so deployers
      // can fix configuration.
      return NextResponse.json({ error: 'AI backend error', details: puterErr.message }, { status: 502 })
    }

    const response = completion?.choices?.[0]?.message?.content ?? completion?.content ?? completion?.text

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
