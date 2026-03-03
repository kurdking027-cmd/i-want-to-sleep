import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List access requests (for admins)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await supabaseAdmin
      .from('access_requests')
      .select(`
        id,
        file_id,
        file_name,
        file_url,
        user_id,
        status,
        created_at,
        users(name, email)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json({ requests: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create new access request
export async function POST(request: NextRequest) {
  try {
    const { fileId, fileName, userId, fileUrl } = await request.json()

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if request already exists
    const { data: existing } = await supabaseAdmin
      .from('access_requests')
      .select('id, status')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ 
        message: 'Request already exists',
        status: existing.status 
      })
    }

    // Create new request
    const { error } = await supabaseAdmin
      .from('access_requests')
      .insert({
        file_id: fileId,
        file_name: fileName,
        file_url: fileUrl,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Access request sent' })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Update request status (approve/deny)
export async function PATCH(request: NextRequest) {
  try {
    const { requestId, status } = await request.json()

    if (!requestId || !['approved', 'denied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('access_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
