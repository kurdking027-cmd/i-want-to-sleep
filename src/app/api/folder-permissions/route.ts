import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch folder permissions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const userId = searchParams.get('userId')

    if (!folderId || !userId) {
      return NextResponse.json(
        { error: 'Folder ID and User ID are required' },
        { status: 400 }
      )
    }

    const { data: permission, error } = await supabaseAdmin
      .from('folder_permissions')
      .select('*')
      .eq('folder_id', folderId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch permission error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json(permission || {
      can_read: false,
      can_write: false,
      can_delete: false
    })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST - Update folder permissions
export async function POST(request: NextRequest) {
  try {
    const { folderId, userId, permissions, adminId } = await request.json()

    if (!folderId || !userId || !adminId) {
      return NextResponse.json(
        { error: 'Folder ID, User ID, and Admin ID are required' },
        { status: 400 }
      )
    }

    // Verify admin
    const { data: admin } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single()

    if (!admin || (admin.role !== 'admin' && admin.role !== 'manager')) {
      return NextResponse.json(
        { error: 'Only admins and managers can update permissions' },
        { status: 403 }
      )
    }

    // Check if permission exists
    const { data: existing } = await supabaseAdmin
      .from('folder_permissions')
      .select('id')
      .eq('folder_id', folderId)
      .eq('user_id', userId)
      .single()

    let result
    if (existing) {
      // Update existing
      result = await supabaseAdmin
        .from('folder_permissions')
        .update({
          can_read: permissions.can_read,
          can_write: permissions.can_write,
          can_delete: permissions.can_delete,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new
      result = await supabaseAdmin
        .from('folder_permissions')
        .insert({
          folder_id: folderId,
          user_id: userId,
          can_read: permissions.can_read,
          can_write: permissions.can_write,
          can_delete: permissions.can_delete
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Update permission error:', result.error)
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Update permission error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
