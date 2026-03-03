'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage, translations } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { 
  Search, 
  UserCheck, 
  UserX, 
  Shield, 
  GraduationCap, 
  Stethoscope,
  Crown,
  MoreVertical,
  Check,
  Loader2,
  Users,
  Monitor,
  Smartphone,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
}

interface User {
  id: string
  name: string | null
  email: string
  password?: string
  role: string
  status: string
  createdAt: string
}

interface UserManagementPanelProps {
  currentUserId: string
  currentUserRole: string
  isSuperAdmin?: boolean
}

export function UserManagementPanel({ currentUserId, currentUserRole, isSuperAdmin }: UserManagementPanelProps) {
  const { language } = useLanguage()
  const { resolvedTheme } = useTheme()
  
  // Only admins and super admins can see passwords and manage devices
  const canManageDevicesAndPasswords = currentUserRole === 'admin' || isSuperAdmin
  
  const [users, setUsers] = useState<User[]>([])
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newRole, setNewRole] = useState<string>('')
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  // Translation helper
  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    return translation[language] || translation.en || key
  }

  // Theme-based styling
  const isDark = resolvedTheme === 'dark'
  const bgCard = isDark ? 'bg-slate-800/50' : 'bg-slate-100'
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200'
  const textPrimary = isDark ? 'text-white' : 'text-slate-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const hoverBg = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200'
  const inputBg = isDark ? 'bg-slate-900/50' : 'bg-slate-50'

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Only request passwords if user is admin or super admin
      const includePasswords = canManageDevicesAndPasswords ? 'true' : 'false'
      const response = await fetch(`/api/users-supabase?requesterId=${currentUserId}&includePasswords=${includePasswords}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUserId, canManageDevicesAndPasswords])

  const fetchAllDevices = useCallback(async () => {
    // Only fetch devices for admins/super admins
    if (!canManageDevicesAndPasswords) return
    try {
      const response = await fetch('/api/devices?allUsers=true')
      if (response.ok) {
        const data = await response.json()
        setAllDevices(data)
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }, [canManageDevicesAndPasswords])

  useEffect(() => {
    fetchUsers()
    fetchAllDevices()
  }, [fetchUsers, fetchAllDevices])

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approve', 
          id: userId, 
          requesterId: currentUserId 
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to approve user')
      }
    } catch (error) {
      console.error('Error approving user:', error)
      alert('Failed to approve user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestrictUser = async (userId: string) => {
    if (!confirm(t('confirm') + '?')) return
    
    setActionLoading(userId)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'restrict', 
          id: userId, 
          requesterId: currentUserId 
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to restrict user')
      }
    } catch (error) {
      console.error('Error restricting user:', error)
      alert('Failed to restrict user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivateUser = async (userId: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reactivate', 
          id: userId, 
          requesterId: currentUserId 
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to reactivate user')
      }
    } catch (error) {
      console.error('Error reactivating user:', error)
      alert('Failed to reactivate user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    setActionLoading(selectedUser.id)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete', 
          id: selectedUser.id, 
          requesterId: currentUserId 
        })
      })

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
        setShowDeleteDialog(false)
        setSelectedUser(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return

    setActionLoading(selectedUser.id)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          requesterId: currentUserId, 
          targetRole: newRole 
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u))
        setShowRoleDialog(false)
        setSelectedUser(null)
        setNewRole('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to change role')
      }
    } catch (error) {
      console.error('Error changing role:', error)
      alert('Failed to change role')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeviceApproval = async (deviceId: string, approved: boolean) => {
    console.log('handleDeviceApproval called:', { deviceId, approved, currentUserId })
    setActionLoading(deviceId)
    try {
      const requestBody = { 
        deviceId, 
        approved, 
        requesterId: currentUserId 
      }
      console.log('Request body:', JSON.stringify(requestBody))
      
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response OK:', response.ok)
      
      const responseText = await response.text()
      console.log('Response text:', responseText)
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText)
          setAllDevices(prev => prev.map(d => d.id === deviceId ? { ...d, is_approved: approved } : d))
        } catch (e) {
          console.error('Failed to parse success response:', e)
        }
      } else {
        let errorMsg = 'Failed to update device'
        try {
          const errorData = JSON.parse(responseText)
          errorMsg = errorData.error || errorMsg
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error updating device:', error)
      alert('Failed to update device: ' + (error instanceof Error ? error.message : 'Network error'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device?')) return
    
    setActionLoading(deviceId)
    try {
      const response = await fetch(`/api/devices?deviceId=${deviceId}&requesterId=${currentUserId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAllDevices(prev => prev.filter(d => d.id !== deviceId))
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />
      case 'manager': return <Shield className="w-4 h-4" />
      case 'doctor': return <Stethoscope className="w-4 h-4" />
      case 'student': return <GraduationCap className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': 
        return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-transparent'
      case 'manager': 
        return 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent'
      case 'doctor': 
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent'
      case 'student': 
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-transparent'
      default: 
        return 'bg-slate-700 text-slate-300 border-slate-600'
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active': 
        return 'bg-emerald-500 text-white border-transparent'
      case 'pending': 
        return 'bg-amber-500 text-white border-transparent'
      case 'inactive': 
        return 'bg-red-500 text-white border-transparent'
      default: 
        return 'bg-slate-700 text-slate-300'
    }
  }

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const getUserDevices = (userId: string) => {
    return allDevices.filter(d => d.user_id === userId)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const pendingCount = users.filter(u => u.status === 'pending').length
  const activeCount = users.filter(u => u.status === 'active').length
  const pendingDevicesCount = allDevices.filter(d => !d.is_approved).length

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
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            Super Admin Access
          </Badge>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 ${canManageDevicesAndPasswords ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{users.length}</p>
              <p className={`text-xs ${textSecondary}`}>{t('totalUsers')}</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{activeCount}</p>
              <p className={`text-xs ${textSecondary}`}>{t('active')}</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{pendingCount}</p>
              <p className={`text-xs ${textSecondary}`}>{t('pending')}</p>
            </div>
          </div>
        </Card>
        {/* Pending Devices Card - Only for Admins/Super Admins */}
        {canManageDevicesAndPasswords && (
          <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${textPrimary}`}>{pendingDevicesCount}</p>
                <p className={`text-xs ${textSecondary}`}>Pending Devices</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchUsers')}
            className={`pl-10 ${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className={`px-4 py-2 rounded-lg ${inputBg} border ${borderColor} ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
          >
            <option value="all">{t('allRoles')}</option>
            <option value="admin">{t('admin')}</option>
            <option value="manager">{t('manager')}</option>
            <option value="doctor">{t('doctor')}</option>
            <option value="student">{t('student')}</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 rounded-lg ${inputBg} border ${borderColor} ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
          >
            <option value="all">{t('allStatus')}</option>
            <option value="active">{t('active')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredUsers.map((u) => {
          const userDevices = getUserDevices(u.id)
          const isExpanded = expandedUsers.has(u.id)
          const isPasswordVisible = visiblePasswords.has(u.id)
          const isCurrentUser = u.id === currentUserId
          const isTargetSuperAdmin = u.email === 'anashawleri67@gmail.com'
          
          return (
            <Card 
              key={u.id} 
              className={`${bgCard} ${borderColor} rounded-xl overflow-hidden`}
            >
              <CardContent className="p-4">
                {/* Main User Row */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center border ${borderColor}`}>
                      {getRoleIcon(u.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold ${textPrimary}`}>
                          {u.name || 'Unnamed User'}
                        </p>
                        <Badge className={`${getRoleBadgeStyle(u.role)} capitalize`}>
                          {t(u.role)}
                        </Badge>
                        <Badge className={`${getStatusBadgeStyle(u.status)} capitalize`}>
                          {t(u.status)}
                        </Badge>
                        {isTargetSuperAdmin && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            <Crown className="w-3 h-3 mr-1" /> Super Admin
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${textSecondary}`}>{u.email}</p>
                      
                      {/* Password Display - Only for Admins/Super Admins */}
                      {canManageDevicesAndPasswords && u.password && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${textSecondary}`}>Password:</span>
                          <code className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-900' : 'bg-slate-200'} ${isPasswordVisible ? textPrimary : 'text-slate-500'}`}>
                            {isPasswordVisible ? u.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className={`${textSecondary} hover:text-teal-400 transition-colors`}
                          >
                            {isPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Expand Devices Button - Only for Admins/Super Admins */}
                    {canManageDevicesAndPasswords && (u.role === 'student' || u.role === 'doctor') && userDevices.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserExpand(u.id)}
                        className={`${textSecondary} hover:text-teal-400`}
                      >
                        <Monitor className="w-4 h-4 mr-1" />
                        {userDevices.length} {userDevices.length === 1 ? 'Device' : 'Devices'}
                        {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </Button>
                    )}

                    {u.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveUser(u.id)}
                        disabled={actionLoading === u.id}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg"
                      >
                        {actionLoading === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            {t('approve')}
                          </>
                        )}
                      </Button>
                    )}

                    {u.status === 'active' && !isCurrentUser && !isTargetSuperAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestrictUser(u.id)}
                        disabled={actionLoading === u.id}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        {actionLoading === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserX className="w-4 h-4 mr-1" />
                            {t('restrict')}
                          </>
                        )}
                      </Button>
                    )}

                    {u.status === 'inactive' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReactivateUser(u.id)}
                        disabled={actionLoading === u.id}
                        className="border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                      >
                        {actionLoading === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            {t('reactivate')}
                          </>
                        )}
                      </Button>
                    )}

                    {/* Actions Menu - Only for Admins/Super Admins */}
                    {(currentUserRole === 'admin' || isSuperAdmin) && !isCurrentUser && !isTargetSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${textSecondary}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={`${isDark ? 'bg-slate-800' : 'bg-white'} ${borderColor}`}>
                          <DropdownMenuLabel className={textSecondary}>{t('changeRole')}</DropdownMenuLabel>
                          <DropdownMenuSeparator className={borderColor} />
                          
                          {/* Admin role - Only Super Admin can assign */}
                          {isSuperAdmin && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser(u)
                                setNewRole('admin')
                                setShowRoleDialog(true)
                              }}
                              className={`${textPrimary} ${hoverBg} focus:${hoverBg}`}
                            >
                              <Crown className="w-4 h-4 mr-2 text-emerald-400" />
                              {t('admin')}
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(u)
                              setNewRole('manager')
                              setShowRoleDialog(true)
                            }}
                            className={`${textPrimary} ${hoverBg} focus:${hoverBg}`}
                          >
                            <Shield className="w-4 h-4 mr-2 text-teal-400" />
                            {t('manager')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(u)
                              setNewRole('doctor')
                              setShowRoleDialog(true)
                            }}
                            className={`${textPrimary} ${hoverBg} focus:${hoverBg}`}
                          >
                            <Stethoscope className="w-4 h-4 mr-2 text-purple-400" />
                            {t('doctor')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(u)
                              setNewRole('student')
                              setShowRoleDialog(true)
                            }}
                            className={`${textPrimary} ${hoverBg} focus:${hoverBg}`}
                          >
                            <GraduationCap className="w-4 h-4 mr-2 text-blue-400" />
                            {t('student')}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className={borderColor} />
                          
                          {/* Delete Option */}
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(u)
                              setShowDeleteDialog(true)
                            }}
                            className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Expanded Devices Section - Only for Admins/Super Admins */}
                {canManageDevicesAndPasswords && isExpanded && (u.role === 'student' || u.role === 'doctor') && (
                  <div className={`mt-4 pt-4 border-t ${borderColor}`}>
                    <h4 className={`font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                      <Monitor className="w-4 h-4 text-teal-400" />
                      Connected Devices ({userDevices.length})
                    </h4>
                    <div className="space-y-2">
                      {userDevices.map((device) => (
                        <div 
                          key={device.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${device.is_approved ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                              {device.os?.toLowerCase().includes('android') || device.os?.toLowerCase().includes('ios') ? (
                                <Smartphone className={`w-4 h-4 ${device.is_approved ? 'text-emerald-400' : 'text-amber-400'}`} />
                              ) : (
                                <Monitor className={`w-4 h-4 ${device.is_approved ? 'text-emerald-400' : 'text-amber-400'}`} />
                              )}
                            </div>
                            <div>
                              <p className={`font-medium ${textPrimary} text-sm`}>{device.device_name}</p>
                              <p className={`text-xs ${textSecondary}`}>
                                {device.browser} • {device.os} • Last active: {new Date(device.last_active).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${device.is_approved ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                              {device.is_approved ? 'Approved' : 'Pending'}
                            </Badge>
                            {!device.is_approved && (
                              <Button
                                size="sm"
                                onClick={() => handleDeviceApproval(device.id, true)}
                                disabled={actionLoading === device.id}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white h-7"
                              >
                                {actionLoading === device.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            )}
                            {device.is_approved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeviceApproval(device.id, false)}
                                disabled={actionLoading === device.id}
                                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 h-7"
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Restrict
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDevice(device.id)}
                              disabled={actionLoading === device.id}
                              className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className={`w-12 h-12 mx-auto mb-4 ${textSecondary}`} />
            <p className={textSecondary}>No users found</p>
          </div>
        )}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className={`${isDark ? 'bg-slate-800' : 'bg-white'} ${borderColor}`}>
          <DialogHeader>
            <DialogTitle className={textPrimary}>{t('changeRole')}</DialogTitle>
            <DialogDescription className={textSecondary}>
              Change role for {selectedUser?.name || selectedUser?.email} to <span className={`font-semibold text-teal-400 capitalize`}>{newRole}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRoleDialog(false)}
              className={`${borderColor} ${textSecondary}`}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleChangeRole}
              disabled={actionLoading === selectedUser?.id}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
            >
              {actionLoading === selectedUser?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className={`${isDark ? 'bg-slate-800' : 'bg-white'} ${borderColor}`}>
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Account</DialogTitle>
            <DialogDescription className={textSecondary}>
              Are you sure you want to delete the account for <span className={`font-semibold ${textPrimary}`}>{selectedUser?.name || selectedUser?.email}</span>?
              This action cannot be undone and will remove all associated data including devices and file permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              className={`${borderColor} ${textSecondary}`}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleDeleteUser}
              disabled={actionLoading === selectedUser?.id}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {actionLoading === selectedUser?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
