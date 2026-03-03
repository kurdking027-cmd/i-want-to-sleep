'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react'

interface Device {
  id: string
  user_id: string
  device_name: string
  device_fingerprint: string
  browser: string
  os: string
  ip_address: string | null
  last_active: string
  is_approved: boolean
  created_at: string
}

interface DeviceContextType {
  currentDeviceId: string | null
  deviceFingerprint: string
  isApproved: boolean | null
  pendingApproval: boolean
  mounted: boolean
  checkDeviceApproval: (userId: string) => Promise<{ approved: boolean; pending: boolean }>
  registerDevice: (userId: string) => Promise<{ approved: boolean; pending: boolean }>
  devices: Device[]
  fetchDevices: (userId: string) => Promise<void>
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined)

// Generate device fingerprint
function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    (navigator as any).deviceMemory || '',
  ]
  
  const fingerprint = components.join('|')
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return Math.abs(hash).toString(36) + Date.now().toString(36)
}

export function getDeviceInfo() {
  const ua = navigator.userAgent
  
  let browser = 'Unknown'
  if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'
  
  let os = 'Unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  
  return { browser, os }
}

function getInitialFingerprint(): string {
  if (typeof window === 'undefined') return ''
  
  let fingerprint = localStorage.getItem('medicore_device_fingerprint')
  if (!fingerprint) {
    fingerprint = generateFingerprint()
    localStorage.setItem('medicore_device_fingerprint', fingerprint)
  }
  return fingerprint
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [deviceFingerprint] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let fingerprint = localStorage.getItem('medicore_device_fingerprint')
      if (!fingerprint) {
        fingerprint = generateFingerprint()
        localStorage.setItem('medicore_device_fingerprint', fingerprint)
      }
      return fingerprint
    }
    return ''
  })
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState<boolean | null>(null)
  const [pendingApproval, setPendingApproval] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])

  const checkDeviceApproval = useCallback(async (userId: string): Promise<{ approved: boolean; pending: boolean }> => {
    if (!deviceFingerprint) return { approved: false, pending: false }
    
    try {
      const response = await fetch(`/api/devices?userId=${userId}&fingerprint=${deviceFingerprint}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentDeviceId(data.deviceId)
        setIsApproved(data.isApproved)
        setPendingApproval(data.pending)
        return { approved: data.isApproved, pending: data.pending }
      }
    } catch (error) {
      console.error('Error checking device approval:', error)
    }
    
    return { approved: false, pending: false }
  }, [deviceFingerprint])

  const registerDevice = useCallback(async (userId: string): Promise<{ approved: boolean; pending: boolean }> => {
    if (!deviceFingerprint) return { approved: false, pending: false }
    
    const { browser, os } = getDeviceInfo()
    const deviceName = `${browser} on ${os}`
    
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fingerprint: deviceFingerprint,
          deviceName,
          browser,
          os
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentDeviceId(data.id)
        setIsApproved(data.is_approved)
        setPendingApproval(!data.is_approved)
        return { approved: data.is_approved, pending: !data.is_approved }
      }
    } catch (error) {
      console.error('Error registering device:', error)
    }
    
    return { approved: false, pending: false }
  }, [deviceFingerprint])

  const fetchDevices = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/devices?userId=${userId}&all=true`)
      if (response.ok) {
        const data = await response.json()
        setDevices(data)
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }, [])

  const value = useMemo(() => ({
    currentDeviceId,
    deviceFingerprint,
    isApproved,
    pendingApproval,
    mounted: true,
    checkDeviceApproval,
    registerDevice,
    devices,
    fetchDevices
  }), [currentDeviceId, deviceFingerprint, isApproved, pendingApproval, checkDeviceApproval, registerDevice, devices, fetchDevices])

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice() {
  const context = useContext(DeviceContext)
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider')
  }
  return context
}
