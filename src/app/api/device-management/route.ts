import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPER_ADMIN_EMAIL = 'anashawleri67@gmail.com'

// GET - Fetch all devices with user info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requesterId = searchParams.get('requesterId')

    if (!requesterId) {
      return NextResponse.json({ error: 'Requester ID is required' }, { status: 400 })
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

    const isSuperAdmin = requester.email === SUPER_ADMIN_EMAIL
    const isAuthorized = requester.role === 'admin' || isSuperAdmin

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Fetch all devices with user info using a join
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select(`
        id,
        user_id,
        device_name,
        device_fingerprint,
        browser,
        os,
        is_approved,
        last_active,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (devicesError) {
      console.error('Fetch devices error:', devicesError)
      return NextResponse.json([])
    }

    // Get user info for each device
    const userIds = [...new Set(devices?.map(d => d.user_id) || [])]
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .in('id', userIds)

    const userMap = new Map(users?.map(u => [u.id, u]) || [])

    // Combine device and user data
    const devicesWithUsers = (devices || []).map(device => ({
      ...device,
      user_name: userMap.get(device.user_id)?.name,
      user_email: userMap.get(device.user_id)?.email,
      user_role: userMap.get(device.user_id)?.role
    }))

    return NextResponse.json(devicesWithUsers)
  } catch (error) {
    console.error('Device management GET error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// POST - Approve, reject, or revoke device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, deviceId, requesterId } = body

    console.log('Device management POST:', { action, deviceId, requesterId })

    if (!action || !deviceId || !requesterId) {
      return NextResponse.json({ error: 'Action, Device ID, and Requester ID are required' }, { status: 400 })
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

    const isSuperAdmin = requester.email === SUPER_ADMIN_EMAIL
    const isAuthorized = requester.role === 'admin' || isSuperAdmin

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Get device info
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    let result

    switch (action) {
      case 'approve':
        result = await supabaseAdmin
          .from('devices')
          .update({ 
            is_approved: true,
            last_active: new Date().toISOString()
          })
          .eq('id', deviceId)
          .select()
          .single()
        break

      case 'reject':
        // Delete the device (reject = remove)
        result = await supabaseAdmin
          .from('devices')
          .delete()
          .eq('id', deviceId)
          .select()
          .single()
        break

      case 'revoke':
        result = await supabaseAdmin
          .from('devices')
          .update({ is_approved: false })
          .eq('id', deviceId)
          .select()
          .single()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result.error) {
      console.error(`${action} device error:`, result.error)
      return NextResponse.json({ error: `Failed to ${action} device: ${result.error.message}` }, { status: 500 })
    }

    console.log(`Device ${action}d successfully:`, result.data)
    return NextResponse.json(result.data || { success: true })
  } catch (error) {
    console.error('Device management POST error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// DELETE - Permanently remove a device
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const requesterId = searchParams.get('requesterId')

    console.log('Device DELETE request:', { deviceId, requesterId })

    if (!deviceId || !requesterId) {
      return NextResponse.json({ error: 'Device ID and Requester ID are required' }, { status: 400 })
    }

    // Verify requester is admin or super admin
    const { data: requester } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('id', requesterId)
      .single()

    const isSuperAdmin = requester?.email === SUPER_ADMIN_EMAIL
    const isAuthorized = requester?.role === 'admin' || isSuperAdmin

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('devices')
      .delete()
      .eq('id', deviceId)

    if (error) {
      console.error('Delete device error:', error)
      return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
    }

    console.log('Device deleted successfully:', deviceId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Device DELETE error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
