import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch manager permissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')

    if (!managerId) {
      return NextResponse.json(
        { error: 'Manager ID is required' },
        { status: 400 }
      )
    }

    const { data: permissions, error } = await supabaseAdmin
      .from('manager_permissions')
      .select('*')
      .eq('manager_id', managerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch permissions error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json(permissions || {
      can_upload_files: false,
      can_manage_permissions: false,
      can_create_folders: false
    })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST - Update manager permissions
export async function POST(request: NextRequest) {
  try {
    const { managerId, adminId, permissions } = await request.json()

    // Verify admin
    const { data: admin } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single()

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update permissions' },
        { status: 403 }
      )
    }

    // Check if permissions exist
    const { data: existing } = await supabaseAdmin
      .from('manager_permissions')
      .select('id')
      .eq('manager_id', managerId)
      .single()

    let result
    if (existing) {
      // Update existing
      result = await supabaseAdmin
        .from('manager_permissions')
        .update({
          ...permissions,
          updated_at: new Date().toISOString()
        })
        .eq('manager_id', managerId)
        .select()
        .single()
    } else {
      // Create new
      result = await supabaseAdmin
        .from('manager_permissions')
        .insert({
          manager_id: managerId,
          ...permissions
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Update permissions error:', result.error)
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Update permissions error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
