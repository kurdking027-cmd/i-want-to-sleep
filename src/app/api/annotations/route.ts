import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Load annotations for a specific page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const userId = searchParams.get('userId')
    const page = searchParams.get('page') || '1'

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'fileId and userId required' }, { status: 400 })
    }

    const pageNum = parseInt(page, 10)

    const { data, error } = await supabaseAdmin
      .from('pdf_annotations')
      .select('annotation_data')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .eq('page_number', pageNum)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase GET error:', error)
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
    }

    return NextResponse.json({ annotationData: data?.annotation_data || null })
  } catch (e) {
    console.error('Server error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Save annotations for a specific page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, userId, page, annotationData } = body

    console.log('POST annotations:', { fileId, userId, page, hasData: !!annotationData })

    if (!fileId || !userId) {
      console.log('Missing fileId or userId')
      return NextResponse.json({ error: 'fileId and userId required' }, { status: 400 })
    }

    const pageNum = page ? parseInt(page, 10) : 1

    // Handle annotation data - be more lenient
    let dataToStore: string
    
    if (!annotationData) {
      // Store empty valid JSON if no data
      dataToStore = JSON.stringify({})
    } else if (typeof annotationData === 'string') {
      // Already a string, validate it's JSON
      try {
        JSON.parse(annotationData)
        dataToStore = annotationData
      } catch {
        console.log('Invalid JSON string')
        return NextResponse.json({ error: 'Invalid annotation data' }, { status: 400 })
      }
    } else {
      // It's an object, stringify it
      try {
        dataToStore = JSON.stringify(annotationData)
      } catch {
        console.log('Cannot stringify annotation data')
        return NextResponse.json({ error: 'Invalid annotation data format' }, { status: 400 })
      }
    }

    console.log('Storing annotation for page:', pageNum)

    const { error } = await supabaseAdmin
      .from('pdf_annotations')
      .upsert(
        { 
          file_id: fileId, 
          user_id: userId, 
          page_number: pageNum,
          annotation_data: dataToStore, 
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'file_id,user_id,page_number' }
      )

    if (error) {
      console.error('Supabase POST error:', error)
      return NextResponse.json({ error: 'Failed to save: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Server error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Clear annotations for a specific page
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const userId = searchParams.get('userId')
    const page = searchParams.get('page') || '1'

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const pageNum = parseInt(page, 10)

    const { error } = await supabaseAdmin
      .from('pdf_annotations')
      .delete()
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .eq('page_number', pageNum)

    if (error) {
      console.error('Supabase DELETE error:', error)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
