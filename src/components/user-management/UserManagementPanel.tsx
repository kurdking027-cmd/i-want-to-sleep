'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Users
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

interface User {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: string
}

interface UserManagementPanelProps {
  currentUserId: string
  currentUserRole: string
}

export function UserManagementPanel({ currentUserId, currentUserRole }: UserManagementPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [newRole, setNewRole] = useState<string>('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users-supabase')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle-status', 
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
    if (!confirm('Are you sure you want to restrict this user?')) return
    
    setActionLoading(userId)
    try {
      const response = await fetch('/api/users-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle-status', 
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
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent'
      case 'manager': 
        return 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent'
      case 'doctor': 
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-transparent'
      case 'student': 
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-slate-400">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeCount}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-teal-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="doctor">Doctor</option>
            <option value="student">Student</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {filteredUsers.map((user) => (
          <Card 
            key={user.id} 
            className="bg-slate-800/50 border-slate-700 rounded-xl overflow-hidden hover:border-teal-500/50 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center border border-slate-600">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {user.name || 'Unnamed User'}
                    </p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getRoleBadgeStyle(user.role)} capitalize`}>
                      {user.role}
                    </Badge>
                    <Badge className={`${getStatusBadgeStyle(user.status)} capitalize`}>
                      {user.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  )}

                  {user.status === 'active' && user.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestrictUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserX className="w-4 h-4 mr-1" />
                          Restrict
                        </>
                      )}
                    </Button>
                  )}

                  {user.status === 'inactive' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="border-teal-500 text-teal-400 hover:bg-teal-500/10"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Reactivate
                        </>
                      )}
                    </Button>
                  )}

                  {currentUserRole === 'admin' && user.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuLabel className="text-slate-400">Change Role</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUser(user)
                            setNewRole('admin')
                            setShowRoleDialog(true)
                          }}
                          className="text-white focus:bg-slate-700"
                        >
                          <Crown className="w-4 h-4 mr-2 text-emerald-500" />
                          Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUser(user)
                            setNewRole('manager')
                            setShowRoleDialog(true)
                          }}
                          className="text-white focus:bg-slate-700"
                        >
                          <Shield className="w-4 h-4 mr-2 text-teal-500" />
                          Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUser(user)
                            setNewRole('doctor')
                            setShowRoleDialog(true)
                          }}
                          className="text-white focus:bg-slate-700"
                        >
                          <Stethoscope className="w-4 h-4 mr-2 text-cyan-500" />
                          Doctor
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUser(user)
                            setNewRole('student')
                            setShowRoleDialog(true)
                          }}
                          className="text-white focus:bg-slate-700"
                        >
                          <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
                          Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">No users found</p>
          </div>
        )}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Change User Role</DialogTitle>
            <DialogDescription className="text-slate-400">
              Change role for {selectedUser?.name || selectedUser?.email} to <span className="font-semibold text-teal-500 capitalize">{newRole}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRoleDialog(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleChangeRole}
              disabled={actionLoading === selectedUser?.id}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
            >
              {actionLoading === selectedUser?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
