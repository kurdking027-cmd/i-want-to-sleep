'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Loader2, Users, Key, Eye, Edit, Trash2, CheckCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  status: string
}

interface FolderPermission {
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

interface PermissionManagerProps {
  userId: string
  userRole: string
  currentFolderId: string | null
}

export function PermissionManager({ userId, userRole, currentFolderId }: PermissionManagerProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [permissions, setPermissions] = useState<FolderPermission>({
    can_read: true,
    can_write: false,
    can_delete: false
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users-supabase')
        if (response.ok) {
          const data = await response.json()
          // Filter to only show students and doctors
          const filteredUsers = data.filter(
            (u: User) => (u.role === 'student' || u.role === 'doctor') && u.status === 'active'
          )
          setUsers(filteredUsers)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    if (userRole === 'admin' || userRole === 'manager') {
      fetchUsers()
    }
  }, [userRole])

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedUserId || !currentFolderId) return

      setLoading(true)
      try {
        const response = await fetch(
          `/api/folder-permissions?folderId=${currentFolderId}&userId=${selectedUserId}`
        )
        if (response.ok) {
          const data = await response.json()
          setPermissions({
            can_read: data.can_read ?? true,
            can_write: data.can_write ?? false,
            can_delete: data.can_delete ?? false
          })
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [selectedUserId, currentFolderId])

  const handleSavePermissions = async () => {
    if (!selectedUserId || !currentFolderId) {
      alert('Please select a user and folder')
      return
    }

    setSaving(true)
    setSuccess(false)
    try {
      const response = await fetch('/api/folder-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: currentFolderId,
          userId: selectedUserId,
          permissions,
          adminId: userId
        })
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save permissions')
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      alert('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (!currentFolderId) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
          <Shield className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-slate-300 font-medium">Select a folder</p>
        <p className="text-sm text-slate-500 mt-1">Choose a folder to manage access permissions</p>
      </div>
    )
  }

  if (userRole !== 'admin' && userRole !== 'manager') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Select User
        </Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white h-12">
            <SelectValue placeholder="Choose a user to manage permissions" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {users.map((user) => (
              <SelectItem 
                key={user.id} 
                value={user.id}
                className="text-white focus:bg-slate-700 focus:text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permissions Card */}
      {selectedUserId && (
        <Card className="bg-slate-800/50 border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-teal-500/10 to-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Access Permissions</h3>
                <p className="text-xs text-slate-400">Configure what this user can do</p>
              </div>
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              </div>
            ) : (
              <>
                {/* Read Permission */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white">
                        Can View
                      </Label>
                      <p className="text-xs text-slate-500">Read files and folders</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions.can_read}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({ ...prev, can_read: checked }))
                    }
                    className="data-[state=checked]:bg-teal-500"
                  />
                </div>

                {/* Write Permission */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Edit className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white">
                        Can Edit
                      </Label>
                      <p className="text-xs text-slate-500">Upload and modify files</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions.can_write}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({ ...prev, can_write: checked }))
                    }
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                {/* Delete Permission */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white">
                        Can Delete
                      </Label>
                      <p className="text-xs text-slate-500">Remove files and folders</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions.can_delete}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({ ...prev, can_delete: checked }))
                    }
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/20 font-semibold uppercase tracking-wide"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Save Permissions
                    </>
                  )}
                </Button>

                {success && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">Permissions saved successfully!</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedUserId && (
        <div className="text-center py-8">
          <p className="text-slate-500">Select a user above to manage their permissions</p>
        </div>
      )}
    </div>
  )
}
