import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPER_ADMIN_EMAIL = 'anashawleri67@gmail.com'

// GET - Check device approval or fetch all devices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const fingerprint = searchParams.get('fingerprint')
    const all = searchParams.get('all')
    const allUsers = searchParams.get('allUsers')

    // Fetch all devices for all users (admin view)
    if (allUsers === 'true') {
      const { data: devices, error } = await supabaseAdmin
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch all devices error:', error)
        // Return empty array if table doesn't exist or other error
        return NextResponse.json([])
      }

      return NextResponse.json(devices || [])
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Fetch all devices for user (admin view)
    if (all === 'true') {
      const { data: devices, error } = await supabaseAdmin
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false })

      if (error) {
        console.error('Fetch devices error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch devices' },
          { status: 500 }
        )
      }

      return NextResponse.json(devices || [])
    }

    // Check specific device approval
    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      )
    }

    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Check device error:', error)
      return NextResponse.json(
        { error: 'Failed to check device' },
        { status: 500 }
      )
    }

    if (!device) {
      return NextResponse.json({
        deviceId: null,
        isApproved: false,
        pending: false
      })
    }

    return NextResponse.json({
      deviceId: device.id,
      isApproved: device.is_approved,
      pending: !device.is_approved
    })
  } catch (error) {
    console.error('Device GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST - Register a new device
export async function POST(request: NextRequest) {
  try {
    const { userId, fingerprint, deviceName, browser, os } = await request.json()

    if (!userId || !fingerprint) {
      return NextResponse.json(
        { error: 'User ID and fingerprint are required' },
        { status: 400 }
      )
    }

    // Check if device already exists
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint)
      .single()

    if (existingDevice) {
      // Update last active
      const { data: updatedDevice, error } = await supabaseAdmin
        .from('devices')
        .update({ last_active: new Date().toISOString() })
        .eq('id', existingDevice.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update device' },
          { status: 500 }
        )
      }

      return NextResponse.json(updatedDevice)
    }

    // Create new device - NEVER auto-approve, always needs admin approval
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .insert({
        user_id: userId,
        device_name: deviceName || `${browser} on ${os}`,
        device_fingerprint: fingerprint,
        browser: browser || 'Unknown',
        os: os || 'Unknown',
        is_approved: false, // Always require admin approval
        last_active: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Create device error:', error)
      return NextResponse.json(
        { error: 'Failed to register device: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(device)
  } catch (error) {
    console.error('Device POST error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PATCH - Approve or reject a device
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, approved, requesterId } = body

    console.log('Device PATCH request:', { deviceId, approved, requesterId })

    if (!deviceId || !requesterId) {
      console.log('Missing deviceId or requesterId')
      return NextResponse.json(
        { error: 'Device ID and requester ID are required' },
        { status: 400 }
      )
    }

    // Verify requester is admin, manager, or super admin
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('id', requesterId)
      .single()

    console.log('Requester check:', { requester, requesterError })

    const isSuperAdmin = requester?.email === SUPER_ADMIN_EMAIL
    if (requesterError || !requester || (requester.role !== 'admin' && requester.role !== 'manager' && !isSuperAdmin)) {
      console.log('Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .update({ is_approved: approved })
      .eq('id', deviceId)
      .select()
      .single()

    if (error) {
      console.error('Update device error:', error)
      return NextResponse.json(
        { error: 'Failed to update device: ' + error.message },
        { status: 500 }
      )
    }

    console.log('Device updated successfully:', device)
    return NextResponse.json(device)
  } catch (error) {
    console.error('Device PATCH error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    )
  }
}

// DELETE - Remove a device
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const requesterId = searchParams.get('requesterId')

    if (!deviceId || !requesterId) {
      return NextResponse.json(
        { error: 'Device ID and requester ID are required' },
        { status: 400 }
      )
    }

    // Verify requester is admin, manager, or super admin
    const { data: requester } = await supabaseAdmin
      .from('users')
      .select('role, email')
      .eq('id', requesterId)
      .single()

    const isSuperAdmin = requester?.email === SUPER_ADMIN_EMAIL
    if (!requester || (requester.role !== 'admin' && requester.role !== 'manager' && !isSuperAdmin)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { error } = await supabaseAdmin
      .from('devices')
      .delete()
      .eq('id', deviceId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete device' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Device DELETE error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
