import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, deviceFingerprint, deviceName, browser, os } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }

    const user = users?.[0]

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check password
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check device approval for students and doctors
    if ((user.role === 'student' || user.role === 'doctor') && deviceFingerprint) {
      // Check if this device exists for this user
      const { data: existingDevice } = await supabaseAdmin
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .single()

      if (existingDevice) {
        // Device exists - check if approved
        if (!existingDevice.is_approved) {
          // Device pending approval
          return NextResponse.json({
            ...user,
            createdAt: user.created_at,
            role: user.role,
            status: user.status,
            password: user.password, // Include password for admin view
            deviceStatus: 'pending',
            deviceId: existingDevice.id
          })
        }
        
        // Update last active
        await supabaseAdmin
          .from('devices')
          .update({ last_active: new Date().toISOString() })
          .eq('id', existingDevice.id)
      } else {
        // New device - register it (NEVER auto-approve, always needs admin approval)
        const { data: newDevice } = await supabaseAdmin
          .from('devices')
          .insert({
            user_id: user.id,
            device_name: deviceName || `${browser} on ${os}`,
            device_fingerprint: deviceFingerprint,
            browser: browser || 'Unknown',
            os: os || 'Unknown',
            is_approved: false, // Always require admin approval for new devices
            last_active: new Date().toISOString()
          })
          .select()
          .single()

        if (newDevice) {
          // New device needs approval
          return NextResponse.json({
            ...user,
            createdAt: user.created_at,
            role: user.role,
            status: user.status,
            password: user.password,
            deviceStatus: 'pending',
            deviceId: newDevice.id
          })
        }
      }
    }

    // Return user without password for admins/managers, but include for reference
    const { password: userPassword, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      password: user.password, // Include password for display
      createdAt: user.created_at,
      role: user.role,
      status: user.status,
      deviceStatus: 'approved'
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
