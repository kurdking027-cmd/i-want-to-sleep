import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch folders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const userId = searchParams.get('userId')

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

    // Fetch folders
    let query = supabaseAdmin
      .from('folders')
      .select('*')
      .order('name', { ascending: true })

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      query = query.is('parent_id', null)
    }

    const { data: folders, error: foldersError } = await query

    if (foldersError) {
      console.error('Fetch folders error:', foldersError)
      return NextResponse.json(
        { error: 'Failed to fetch folders: ' + foldersError.message },
        { status: 500 }
      )
    }

    // Admin and manager can see all folders
    if (user.role === 'admin' || user.role === 'manager') {
      return NextResponse.json(folders || [])
    }

    // Filter folders based on permissions for non-admin/manager users
    const accessibleFolders = []
    for (const folder of folders || []) {
      const { data: permission } = await supabaseAdmin
        .from('folder_permissions')
        .select('can_read')
        .eq('folder_id', folder.id)
        .eq('user_id', userId)
        .single()

      if (permission?.can_read) {
        accessibleFolders.push(folder)
      }
    }

    return NextResponse.json(accessibleFolders)
  } catch (error) {
    console.error('Get folders error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const { name, parentId, userId } = await request.json()

    console.log('Create folder request:', { name, parentId, userId })

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and User ID are required' },
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

    // Students and doctors cannot create folders
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'You do not have permission to create folders' },
        { status: 403 }
      )
    }

    // Check permissions for managers
    if (user.role === 'manager') {
      const { data: managerPerms, error: permError } = await supabaseAdmin
        .from('manager_permissions')
        .select('can_create_folders')
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
      } else if (!managerPerms.can_create_folders) {
        return NextResponse.json(
          { error: 'You do not have permission to create folders' },
          { status: 403 }
        )
      }
    }

    // Create folder - use created_by column
    const { data: folder, error: createError } = await supabaseAdmin
      .from('folders')
      .insert({
        name,
        parent_id: parentId || null,
        created_by: userId
      })
      .select()
      .single()

    if (createError) {
      console.error('Create folder error:', createError)
      return NextResponse.json(
        { error: 'Failed to create folder: ' + createError.message },
        { status: 500 }
      )
    }

    console.log('Folder created:', folder)
    return NextResponse.json(folder)
  } catch (error) {
    console.error('Create folder error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// DELETE - Delete a folder
export async function DELETE(request: NextRequest) {
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

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only admins and managers can delete folders' },
        { status: 403 }
      )
    }

    // Delete folder
    const { error: deleteError } = await supabaseAdmin
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (deleteError) {
      console.error('Delete folder error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete folder: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete folder error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
