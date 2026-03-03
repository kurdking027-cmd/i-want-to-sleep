'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage, translations } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { 
  Monitor, 
  Smartphone, 
  Check, 
  X, 
  Loader2, 
  Shield, 
  Clock, 
  Globe, 
  Chrome,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  User,
  Crown
} from 'lucide-react'

interface Device {
  id: string
  user_id: string
  device_name: string
  device_fingerprint: string
  browser: string
  os: string
  is_approved: boolean
  last_active: string
  created_at: string
  user_name?: string
  user_email?: string
  user_role?: string
}

interface DeviceManagementPanelProps {
  currentUserId: string
  currentUserRole: string
  isSuperAdmin?: boolean
}

export function DeviceManagementPanel({ currentUserId, currentUserRole, isSuperAdmin }: DeviceManagementPanelProps) {
  const { language } = useLanguage()
  const { resolvedTheme } = useTheme()
  
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')

  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    return translation[language] || translation.en || key
  }

  const isDark = resolvedTheme === 'dark'
  const bgCard = isDark ? 'bg-slate-800/50' : 'bg-slate-100'
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200'
  const textPrimary = isDark ? 'text-white' : 'text-slate-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/device-management?requesterId=${currentUserId}`)
      if (response.ok) {
        const data = await response.json()
        setDevices(data)
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleApprove = async (deviceId: string) => {
    setActionLoading(deviceId)
    try {
      const response = await fetch('/api/device-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          deviceId,
          requesterId: currentUserId
        })
      })

      if (response.ok) {
        setDevices(prev => prev.map(d => 
          d.id === deviceId ? { ...d, is_approved: true } : d
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to approve device')
      }
    } catch (error) {
      console.error('Error approving device:', error)
      alert('Failed to approve device')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (deviceId: string) => {
    if (!confirm('Are you sure you want to reject and remove this device?')) return
    
    setActionLoading(deviceId)
    try {
      const response = await fetch('/api/device-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          deviceId,
          requesterId: currentUserId
        })
      })

      if (response.ok) {
        setDevices(prev => prev.filter(d => d.id !== deviceId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to reject device')
      }
    } catch (error) {
      console.error('Error rejecting device:', error)
      alert('Failed to reject device')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke access for this device?')) return
    
    setActionLoading(deviceId)
    try {
      const response = await fetch('/api/device-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          deviceId,
          requesterId: currentUserId
        })
      })

      if (response.ok) {
        setDevices(prev => prev.map(d => 
          d.id === deviceId ? { ...d, is_approved: false } : d
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to revoke device')
      }
    } catch (error) {
      console.error('Error revoking device:', error)
      alert('Failed to revoke device')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to permanently remove this device?')) return
    
    setActionLoading(deviceId)
    try {
      const response = await fetch(`/api/device-management?deviceId=${deviceId}&requesterId=${currentUserId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDevices(prev => prev.filter(d => d.id !== deviceId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete device')
      }
    } catch (error) {
      console.error('Error deleting device:', error)
      alert('Failed to delete device')
    } finally {
      setActionLoading(null)
    }
  }

  const getBrowserIcon = (browser: string) => {
    const b = browser?.toLowerCase() || ''
    if (b.includes('chrome')) return <Chrome className="w-5 h-5 text-yellow-400" />
    if (b.includes('firefox')) return <Globe className="w-5 h-5 text-orange-400" />
    if (b.includes('safari')) return <Globe className="w-5 h-5 text-blue-400" />
    return <Globe className="w-5 h-5 text-slate-400" />
  }

  const getDeviceIcon = (os: string) => {
    const o = os?.toLowerCase() || ''
    if (o.includes('android') || o.includes('ios') || o.includes('iphone')) {
      return <Smartphone className="w-6 h-6" />
    }
    return <Monitor className="w-6 h-6" />
  }

  const filteredDevices = devices.filter(d => {
    if (filter === 'pending') return !d.is_approved
    if (filter === 'approved') return d.is_approved
    return true
  })

  const pendingCount = devices.filter(d => !d.is_approved).length
  const approvedCount = devices.filter(d => d.is_approved).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Super Admin Badge */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            Super Admin Access
          </Badge>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{devices.length}</p>
              <p className={`text-xs ${textSecondary}`}>Total Devices</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4 cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{pendingCount}</p>
              <p className={`text-xs ${textSecondary}`}>Pending Approval</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4 cursor-pointer transition-all ${filter === 'approved' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setFilter(filter === 'approved' ? 'all' : 'approved')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{approvedCount}</p>
              <p className={`text-xs ${textSecondary}`}>Approved</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            className={filter === 'all' 
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white' 
              : `${borderColor} ${textSecondary}`}
          >
            All Devices
          </Button>
          <Button
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'default' : 'outline'}
            className={filter === 'pending' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
              : `${borderColor} ${textSecondary}`}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            onClick={() => setFilter('approved')}
            variant={filter === 'approved' ? 'default' : 'outline'}
            className={filter === 'approved' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
              : `${borderColor} ${textSecondary}`}
          >
            Approved ({approvedCount})
          </Button>
        </div>
        <Button onClick={fetchDevices} variant="ghost" className={`${textSecondary} hover:text-teal-400`}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Devices List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {filteredDevices.length === 0 ? (
          <Card className={`${bgCard} ${borderColor} rounded-xl p-8 text-center`}>
            <Monitor className={`w-12 h-12 mx-auto mb-4 ${textSecondary}`} />
            <p className={textSecondary}>
              {filter === 'pending' ? 'No pending devices' : 
               filter === 'approved' ? 'No approved devices' : 
               'No devices found'}
            </p>
          </Card>
        ) : (
          filteredDevices.map((device) => (
            <Card key={device.id} className={`${bgCard} ${borderColor} rounded-xl overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Device Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Device Icon */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      device.is_approved 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {getDeviceIcon(device.os)}
                    </div>

                    {/* Device Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`font-semibold ${textPrimary}`}>{device.device_name || 'Unknown Device'}</h3>
                        <Badge className={`${device.is_approved 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-amber-500 text-white'} text-xs`}>
                          {device.is_approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                      
                      {/* User Info */}
                      <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
                        <User className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span className={textPrimary}>{device.user_name || 'Unknown'}</span>
                        <span className={textSecondary}>({device.user_email})</span>
                        <Badge variant="outline" className={`${borderColor} text-xs`}>
                          {device.user_role}
                        </Badge>
                      </div>

                      {/* Device Meta */}
                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        <div className="flex items-center gap-1.5">
                          {getBrowserIcon(device.browser)}
                          <span className={textSecondary}>{device.browser || 'Unknown Browser'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-purple-400" />
                          <span className={textSecondary}>{device.os || 'Unknown OS'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className={textSecondary}>
                            Last: {new Date(device.last_active).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!device.is_approved ? (
                      <>
                        <Button
                          onClick={() => handleApprove(device.id)}
                          disabled={actionLoading === device.id}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg"
                        >
                          {actionLoading === device.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleReject(device.id)}
                          disabled={actionLoading === device.id}
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          {actionLoading === device.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleRevoke(device.id)}
                          disabled={actionLoading === device.id}
                          variant="outline"
                          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                        >
                          {actionLoading === device.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDelete(device.id)}
                          disabled={actionLoading === device.id}
                          variant="ghost"
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          {actionLoading === device.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
