import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPER_ADMIN_EMAIL = 'anashawleri67@gmail.com'

// GET - Fetch file permissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const userId = searchParams.get('userId')
    const allFiles = searchParams.get('allFiles')
    const allUsers = searchParams.get('allUsers')

    // Get all file permissions with file and user details (admin view)
    if (allUsers === 'true') {
      const { data: permissions, error } = await supabaseAdmin
        .from('file_permissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch all file permissions error:', error)
        return NextResponse.json([])
      }

      return NextResponse.json(permissions || [])
    }

    // Get all permissions for a specific file
    if (fileId && allFiles === 'true') {
      const { data: permissions, error } = await supabaseAdmin
        .from('file_permissions')
        .select('*')
        .eq('file_id', fileId)

      if (error) {
        console.error('Fetch file permissions error:', error)
        return NextResponse.json([])
      }

      return NextResponse.json(permissions || [])
    }

    // Get all permissions for a specific user (student/doctor)
    if (userId) {
      const { data: permissions, error } = await supabaseAdmin
        .from('file_permissions')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Fetch user file permissions error:', error)
        return NextResponse.json([])
      }

      return NextResponse.json(permissions || [])
    }

    // Check specific file permission for a user
    if (fileId && userId) {
      const { data: permission, error } = await supabaseAdmin
        .from('file_permissions')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Check file permission error:', error)
        return NextResponse.json({ can_view: false, can_download: false })
      }

      return NextResponse.json(permission || { can_view: false, can_download: false })
    }

    return NextResponse.json([])
  } catch (error) {
    console.error('File permission GET error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// POST - Create or update file permission
export async function POST(request: NextRequest) {
  try {
    const { fileId, userId, canView, canDownload, requesterId, isSuperAdmin } = await request.json()

    if (!fileId || !userId || !requesterId) {
      return NextResponse.json(
        { error: 'File ID, User ID, and Requester ID are required' },
        { status: 400 }
      )
    }

    // Verify requester is admin or super admin
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('id', requesterId)
      .single()

    if (requesterError || !requester) {
      return NextResponse.json({ error: 'Requester not found' }, { status: 404 })
    }

    // Check if user is super admin (by email) or has admin role
    const isUserSuperAdmin = requester.email === SUPER_ADMIN_EMAIL || isSuperAdmin
    const isAuthorized = requester.role === 'admin' || isUserSuperAdmin

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Super Admin role required' }, { status: 403 })
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabaseAdmin
      .from('file_permissions')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .single()

    if (existingPermission) {
      // Update existing permission
      const { data: permission, error } = await supabaseAdmin
        .from('file_permissions')
        .update({
          can_view: canView,
          can_download: canDownload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPermission.id)
        .select()
        .single()

      if (error) {
        console.error('Update file permission error:', error)
        return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 })
      }

      return NextResponse.json(permission)
    } else {
      // Create new permission
      const { data: permission, error } = await supabaseAdmin
        .from('file_permissions')
        .insert({
          file_id: fileId,
          user_id: userId,
          can_view: canView,
          can_download: canDownload
        })
        .select()
        .single()

      if (error) {
        console.error('Create file permission error:', error)
        return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 })
      }

      return NextResponse.json(permission)
    }
  } catch (error) {
    console.error('File permission POST error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// DELETE - Remove file permission
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const permissionId = searchParams.get('permissionId')
    const requesterId = searchParams.get('requesterId')

    if (!permissionId || !requesterId) {
      return NextResponse.json(
        { error: 'Permission ID and Requester ID are required' },
        { status: 400 }
      )
    }

    // Verify requester is admin or super admin
    const { data: requester } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('id', requesterId)
      .single()

    const isUserSuperAdmin = requester?.email === SUPER_ADMIN_EMAIL
    const isAuthorized = requester?.role === 'admin' || isUserSuperAdmin

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('file_permissions')
      .delete()
      .eq('id', permissionId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('File permission DELETE error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
