import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPER_ADMIN_EMAIL = 'anashawleri67@gmail.com'

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requesterId = searchParams.get('requesterId')
    const includePasswords = searchParams.get('includePasswords') === 'true'

    // Check if requester is admin or super admin (for password visibility)
    let isAdmin = false
    if (requesterId && includePasswords) {
      const { data: requester } = await supabaseAdmin
        .from('users')
        .select('role, email')
        .eq('id', requesterId)
        .single()
      isAdmin = requester?.role === 'admin' || requester?.email === SUPER_ADMIN_EMAIL
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch users error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users: ' + error.message },
        { status: 500 }
      )
    }

    // Only include passwords for admins, otherwise remove them
    const formattedUsers = users?.map(user => {
      if (isAdmin) {
        // Include password for admins
        return {
          ...user,
          password: user.password,
          createdAt: user.created_at
        }
      } else {
        // Remove password for non-admins
        const { password: _, ...userWithoutPassword } = user
        return {
          ...userWithoutPassword,
          createdAt: user.created_at
        }
      }
    }) || []

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// POST - Toggle status, approve, restrict, change role, or delete user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, id, requesterId, userId, targetRole } = body

    console.log('Users API request:', { action, id, requesterId, userId, targetRole })

    // Validate requester
    const requesterIdToUse = requesterId || userId
    if (!requesterIdToUse) {
      return NextResponse.json(
        { error: 'Requester ID is required' },
        { status: 400 }
      )
    }

    // Verify requester is admin, manager, or super admin
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('id', requesterIdToUse)
      .single()

    if (requesterError) {
      console.error('Error fetching requester:', requesterError)
      return NextResponse.json(
        { error: 'Failed to verify permissions: ' + requesterError.message },
        { status: 500 }
      )
    }

    if (!requester) {
      return NextResponse.json(
        { error: 'Requester not found' },
        { status: 404 }
      )
    }

    const isSuperAdmin = requester.email === SUPER_ADMIN_EMAIL
    const isAdmin = requester.role === 'admin'
    const isManager = requester.role === 'manager'

    // Only admins and super admins can manage users
    if (!isAdmin && !isSuperAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin, Manager, or Super Admin role required' },
        { status: 403 }
      )
    }

    // Helper function to update user status
    const updateUserStatus = async (targetId: string, newStatus: string) => {
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ status: newStatus })
        .eq('id', targetId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user status:', updateError)
        throw new Error('Failed to update user: ' + updateError.message)
      }

      if (!updatedUser) {
        throw new Error('User not found')
      }

      return updatedUser
    }

    // Helper function to update user role
    const updateUserRole = async (targetId: string, newRole: string) => {
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: newRole, status: 'active' })
        .eq('id', targetId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user role:', updateError)
        throw new Error('Failed to update role: ' + updateError.message)
      }

      if (!updatedUser) {
        throw new Error('User not found')
      }

      return updatedUser
    }

    // Handle delete action
    if (action === 'delete') {
      const targetId = id || userId
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target user ID is required' },
          { status: 400 }
        )
      }

      // Prevent deleting super admin
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', targetId)
        .single()

      if (targetUser?.email === SUPER_ADMIN_EMAIL) {
        return NextResponse.json(
          { error: 'Cannot delete the Super Admin account' },
          { status: 403 }
        )
      }

      // Only super admin and admins can delete users
      if (!isSuperAdmin && !isAdmin) {
        return NextResponse.json(
          { error: 'Only admins and super admins can delete users' },
          { status: 403 }
        )
      }

      // Delete user's devices first
      await supabaseAdmin
        .from('devices')
        .delete()
        .eq('user_id', targetId)

      // Delete user's file permissions
      await supabaseAdmin
        .from('file_permissions')
        .delete()
        .eq('user_id', targetId)

      // Delete user
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', targetId)

      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete user: ' + deleteError.message },
          { status: 500 }
        )
      }

      console.log('User deleted:', targetId)
      return NextResponse.json({ success: true, deletedId: targetId })
    }

    // Handle approve action
    if (action === 'approve') {
      const targetId = id || userId
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target user ID is required' },
          { status: 400 }
        )
      }

      const updatedUser = await updateUserStatus(targetId, 'active')
      const { password: _, ...userWithoutPassword } = updatedUser
      console.log('User approved:', userWithoutPassword)
      return NextResponse.json({
        ...userWithoutPassword,
        createdAt: updatedUser.created_at
      })
    }

    // Handle restrict action
    if (action === 'restrict') {
      const targetId = id || userId
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target user ID is required' },
          { status: 400 }
        )
      }

      // Try 'inactive' first, then 'restricted' if constraint fails
      try {
        const updatedUser = await updateUserStatus(targetId, 'inactive')
        const { password: _, ...userWithoutPassword } = updatedUser
        console.log('User restricted:', userWithoutPassword)
        return NextResponse.json({
          ...userWithoutPassword,
          createdAt: updatedUser.created_at
        })
      } catch (error) {
        // If 'inactive' is not allowed, try 'restricted'
        console.log('Trying restricted status instead...')
        const updatedUser = await updateUserStatus(targetId, 'restricted')
        const { password: _, ...userWithoutPassword } = updatedUser
        console.log('User restricted:', userWithoutPassword)
        return NextResponse.json({
          ...userWithoutPassword,
          createdAt: updatedUser.created_at
        })
      }
    }

    // Handle reactivate action
    if (action === 'reactivate') {
      const targetId = id || userId
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target user ID is required' },
          { status: 400 }
        )
      }

      const updatedUser = await updateUserStatus(targetId, 'active')
      const { password: _, ...userWithoutPassword } = updatedUser
      console.log('User reactivated:', userWithoutPassword)
      return NextResponse.json({
        ...userWithoutPassword,
        createdAt: updatedUser.created_at
      })
    }

    // Legacy toggle-status action
    if (action === 'toggle-status') {
      const targetId = id || userId
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target user ID is required' },
          { status: 400 }
        )
      }

      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('status')
        .eq('id', targetId)
        .single()

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Determine new status
      let newStatus = 'active'
      if (targetUser.status === 'active') {
        newStatus = 'inactive'
      } else if (targetUser.status === 'inactive' || targetUser.status === 'restricted') {
        newStatus = 'active'
      } else if (targetUser.status === 'pending') {
        newStatus = 'active'
      }

      const updatedUser = await updateUserStatus(targetId, newStatus)
      const { password: _, ...userWithoutPassword } = updatedUser
      return NextResponse.json({
        ...userWithoutPassword,
        createdAt: updatedUser.created_at
      })
    }

    // Change role action
    if (userId && targetRole) {
      // Only admin and super admin can change roles
      if (!isAdmin && !isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only admins and super admins can change user roles' },
          { status: 403 }
        )
      }

      const validRoles = ['admin', 'manager', 'doctor', 'student']
      if (!validRoles.includes(targetRole)) {
        return NextResponse.json(
          { error: 'Invalid role. Valid roles are: ' + validRoles.join(', ') },
          { status: 400 }
        )
      }

      // Only super admin can create other admins
      if (targetRole === 'admin' && !isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admin can assign admin role' },
          { status: 403 }
        )
      }

      const updatedUser = await updateUserRole(userId, targetRole)
      const { password: _, ...userWithoutPassword } = updatedUser
      console.log('Role changed:', userWithoutPassword)
      return NextResponse.json({
        ...userWithoutPassword,
        createdAt: updatedUser.created_at
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: approve, restrict, reactivate, delete, toggle-status, or provide userId and targetRole' },
      { status: 400 }
    )
  } catch (error) {
    console.error('User action error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
