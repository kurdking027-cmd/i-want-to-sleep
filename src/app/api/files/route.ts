import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch files in a folder or all files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const userId = searchParams.get('userId')
    const allFiles = searchParams.get('allFiles')

    // Fetch all files (for admin permissions panel)
    if (allFiles === 'true') {
      const { data: files, error: filesError } = await supabaseAdmin
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })

      if (filesError) {
        console.error('Fetch all files error:', filesError)
        return NextResponse.json([])
      }

      const transformedFiles = (files || []).map(file => ({
        ...file,
        type: file.type || 'drive_link'
      }))

      return NextResponse.json(transformedFiles)
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check folder permissions if not admin/manager
    if (user.role !== 'admin' && user.role !== 'manager' && folderId) {
      const { data: permission } = await supabaseAdmin
        .from('folder_permissions')
        .select('can_read')
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .single()

      if (!permission?.can_read) {
        return NextResponse.json(
          { error: 'Access denied to this folder' },
          { status: 403 }
        )
      }
    }

    // Fetch files
    let query = supabaseAdmin
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })

    if (folderId) {
      query = query.eq('folder_id', folderId)
    } else {
      query = query.is('folder_id', null)
    }

    const { data: files, error: filesError } = await query

    if (filesError) {
      console.error('Fetch files error:', filesError)
      return NextResponse.json(
        { error: 'Failed to fetch files: ' + filesError.message },
        { status: 500 }
      )
    }

    // Transform files to include type field if missing
    const transformedFiles = (files || []).map(file => ({
      ...file,
      type: file.type || 'drive_link'
    }))

    return NextResponse.json(transformedFiles)
  } catch (error) {
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// POST - Create a new file or drive link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, url, folderId, userId } = body

    console.log('Create file request:', { name, type, url, folderId, userId })

    if (!name || !url || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, and userId are required' },
        { status: 400 }
      )
    }

    // Get user role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Students and doctors cannot upload files
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'You do not have permission to upload files' },
        { status: 403 }
      )
    }

    // Check permissions for managers
    if (user.role === 'manager') {
      const { data: managerPerms, error: permError } = await supabaseAdmin
        .from('manager_permissions')
        .select('can_upload_files')
        .eq('manager_id', userId)
        .single()

      // If no permissions record exists, create one with all permissions
      if (permError || !managerPerms) {
        console.log('Creating default manager permissions for:', userId)
        await supabaseAdmin
          .from('manager_permissions')
          .upsert({
            manager_id: userId,
            can_upload_files: true,
            can_manage_permissions: true,
            can_create_folders: true
          })
      } else if (!managerPerms.can_upload_files) {
        return NextResponse.json(
          { error: 'You do not have permission to upload files' },
          { status: 403 }
        )
      }
    }

    // Create file record - use only existing columns in table
    const fileData: Record<string, unknown> = {
      name,
      url,
      type: type || 'drive_link',
      folder_id: folderId || null,
      user_id: userId
    }
    
    const { data: file, error: createError } = await supabaseAdmin
      .from('files')
      .insert(fileData)
      .select()
      .single()

    if (createError) {
      console.error('Create file error:', createError)
      return NextResponse.json(
        { error: 'Failed to create file: ' + createError.message },
        { status: 500 }
      )
    }

    console.log('File created:', file)
    return NextResponse.json(file)
  } catch (error) {
    console.error('Create file error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// DELETE - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const userId = searchParams.get('userId')

    if (!fileId || !userId) {
      return NextResponse.json(
        { error: 'File ID and User ID are required' },
        { status: 400 }
      )
    }

    // Get user role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Admin can delete any file
    if (user.role === 'admin') {
      const { error: deleteError } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', fileId)

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to delete file: ' + deleteError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Check file ownership or folder permission
    const { data: file } = await supabaseAdmin
      .from('files')
      .select('user_id, folder_id')
      .eq('id', fileId)
      .single()

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check if user uploaded the file
    if (file.user_id === userId) {
      const { error: deleteError } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', fileId)

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to delete file: ' + deleteError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Check folder permission for delete
    if (file.folder_id) {
      const { data: permission } = await supabaseAdmin
        .from('folder_permissions')
        .select('can_delete')
        .eq('folder_id', file.folder_id)
        .eq('user_id', userId)
        .single()

      if (permission?.can_delete) {
        const { error: deleteError } = await supabaseAdmin
          .from('files')
          .delete()
          .eq('id', fileId)

        if (deleteError) {
          return NextResponse.json(
            { error: 'Failed to delete file: ' + deleteError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json(
      { error: 'You do not have permission to delete this file' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
