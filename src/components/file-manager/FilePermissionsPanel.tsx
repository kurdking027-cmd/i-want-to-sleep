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
  Eye, 
  Download, 
  FileText,
  Lock,
  Unlock,
  Check,
  X,
  Loader2,
  Files,
  Users,
  RefreshCw,
  Ban,
  EyeOff,
  GraduationCap,
  Stethoscope,
  Video,
  Image as ImageIcon,
  Music,
  File,
  Link,
  Crown
} from 'lucide-react'

interface File {
  id: string
  name: string
  type: string
  url: string
  folder_id: string | null
  user_id: string
  created_at: string
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
  status: string
}

interface FilePermission {
  id: string
  file_id: string
  user_id: string
  can_view: boolean
  can_download: boolean
  created_at: string
}

interface FilePermissionsPanelProps {
  currentUserId: string
  currentUserRole: string
  isSuperAdmin?: boolean
}

export function FilePermissionsPanel({ currentUserId, currentUserRole, isSuperAdmin }: FilePermissionsPanelProps) {
  const { language } = useLanguage()
  const { resolvedTheme } = useTheme()
  
  const canManagePermissions = currentUserRole === 'admin' || isSuperAdmin
  
  const [files, setFiles] = useState<File[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<FilePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'files' | 'users'>('files')

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
  const hoverBg = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200'
  const inputBg = isDark ? 'bg-slate-900/50' : 'bg-slate-50'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const filesRes = await fetch('/api/files?allFiles=true')
      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData)
      }

      const usersRes = await fetch(`/api/users-supabase?requesterId=${currentUserId}&includePasswords=false`)
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.filter((u: User) => u.role === 'student' || u.role === 'doctor'))
      }

      const permRes = await fetch('/api/file-permissions?allUsers=true')
      if (permRes.ok) {
        const permData = await permRes.json()
        setPermissions(permData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getPermission = (fileId: string, userId: string) => {
    return permissions.find(p => p.file_id === fileId && p.user_id === userId)
  }

  const handleToggleView = async (fileId: string, userId: string, currentValue: boolean) => {
    const permId = `${fileId}-${userId}`
    setActionLoading(permId)
    
    try {
      const response = await fetch('/api/file-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          userId,
          canView: !currentValue,
          canDownload: getPermission(fileId, userId)?.can_download || false,
          requesterId: currentUserId,
          isSuperAdmin
        })
      })

      if (response.ok) {
        const newPerm = await response.json()
        setPermissions(prev => {
          const existing = prev.findIndex(p => p.file_id === fileId && p.user_id === userId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = newPerm
            return updated
          }
          return [...prev, newPerm]
        })
      }
    } catch (error) {
      console.error('Error toggling view permission:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleDownload = async (fileId: string, userId: string, currentValue: boolean) => {
    const permId = `${fileId}-${userId}-dl`
    setActionLoading(permId)
    
    try {
      const response = await fetch('/api/file-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          userId,
          canView: getPermission(fileId, userId)?.can_view || false,
          canDownload: !currentValue,
          requesterId: currentUserId,
          isSuperAdmin
        })
      })

      if (response.ok) {
        const newPerm = await response.json()
        setPermissions(prev => {
          const existing = prev.findIndex(p => p.file_id === fileId && p.user_id === userId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = newPerm
            return updated
          }
          return [...prev, newPerm]
        })
      }
    } catch (error) {
      console.error('Error toggling download permission:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGrantAll = async (fileId: string, userId: string) => {
    const permId = `${fileId}-${userId}-all`
    setActionLoading(permId)
    
    try {
      const response = await fetch('/api/file-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          userId,
          canView: true,
          canDownload: true,
          requesterId: currentUserId,
          isSuperAdmin
        })
      })

      if (response.ok) {
        const newPerm = await response.json()
        setPermissions(prev => {
          const existing = prev.findIndex(p => p.file_id === fileId && p.user_id === userId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = newPerm
            return updated
          }
          return [...prev, newPerm]
        })
      }
    } catch (error) {
      console.error('Error granting all permissions:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeAll = async (fileId: string, userId: string) => {
    const permId = `${fileId}-${userId}-revoke`
    setActionLoading(permId)
    
    try {
      const response = await fetch('/api/file-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          userId,
          canView: false,
          canDownload: false,
          requesterId: currentUserId,
          isSuperAdmin
        })
      })

      if (response.ok) {
        const newPerm = await response.json()
        setPermissions(prev => {
          const existing = prev.findIndex(p => p.file_id === fileId && p.user_id === userId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = newPerm
            return updated
          }
          return [...prev, newPerm]
        })
      }
    } catch (error) {
      console.error('Error revoking all permissions:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return <FileText className="w-4 h-4 text-red-400" />
    if (type?.includes('image')) return <ImageIcon className="w-4 h-4 text-purple-400" />
    if (type?.includes('video')) return <Video className="w-4 h-4 text-pink-400" />
    if (type?.includes('audio')) return <Music className="w-4 h-4 text-indigo-400" />
    if (type === 'drive_link') return <Link className="w-4 h-4 text-teal-400" />
    return <File className="w-4 h-4 text-slate-400" />
  }

  const getUserIcon = (role: string) => {
    if (role === 'doctor') return <Stethoscope className="w-4 h-4 text-purple-400" />
    return <GraduationCap className="w-4 h-4 text-blue-400" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    )
  }

  if (!canManagePermissions) {
    return (
      <div className="text-center py-12">
        <Lock className={`w-12 h-12 mx-auto mb-4 ${textSecondary}`} />
        <p className={textSecondary}>You don't have permission to manage file permissions</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Super Admin Badge */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            Super Admin Access
          </Badge>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <Files className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{files.length}</p>
              <p className={`text-xs ${textSecondary}`}>Total Files</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{users.length}</p>
              <p className={`text-xs ${textSecondary}`}>Students/Doctors</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{permissions.filter(p => p.can_view).length}</p>
              <p className={`text-xs ${textSecondary}`}>View Permissions</p>
            </div>
          </div>
        </Card>
        <Card className={`${bgCard} ${borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{permissions.filter(p => p.can_download).length}</p>
              <p className={`text-xs ${textSecondary}`}>Download Permissions</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode('files')}
            variant={viewMode === 'files' ? 'default' : 'outline'}
            className={viewMode === 'files' 
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white' 
              : `${borderColor} ${textSecondary}`}
          >
            <Files className="w-4 h-4 mr-2" />
            By Files
          </Button>
          <Button
            onClick={() => setViewMode('users')}
            variant={viewMode === 'users' ? 'default' : 'outline'}
            className={viewMode === 'users' 
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white' 
              : `${borderColor} ${textSecondary}`}
          >
            <Users className="w-4 h-4 mr-2" />
            By Users
          </Button>
        </div>
        
        <Button
          onClick={fetchData}
          variant="ghost"
          className={`${textSecondary} hover:text-teal-400`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'files' ? 'Search files...' : 'Search users...'}
            className={`pl-10 ${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500`}
          />
        </div>
        
        {viewMode === 'users' && (
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className={`px-4 py-2 rounded-lg ${inputBg} border ${borderColor} ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="doctor">Doctors</option>
          </select>
        )}
      </div>

      {/* Content - Files View */}
      {viewMode === 'files' && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredFiles.map((file) => (
            <Card key={file.id} className={`${bgCard} ${borderColor} rounded-xl overflow-hidden`}>
              <CardContent className="p-4">
                {/* File Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div>
                      <p className={`font-semibold ${textPrimary}`}>{file.name}</p>
                      <p className={`text-xs ${textSecondary}`}>
                        {file.type || 'File'} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${borderColor} ${textSecondary}`}>
                    {users.length} users
                  </Badge>
                </div>
                
                {/* Users List - Grid Layout for Better Visibility */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredUsers.map((user) => {
                    const perm = getPermission(file.id, user.id)
                    const canView = perm?.can_view || false
                    const canDownload = perm?.can_download || false
                    
                    return (
                      <div 
                        key={user.id}
                        className={`p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${borderColor}`}
                      >
                        {/* User Info Row */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${user.role === 'doctor' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                            {getUserIcon(user.role)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${textPrimary} text-sm truncate`}>{user.name || 'Unnamed'}</p>
                            <p className={`text-xs ${textSecondary} truncate`}>{user.email}</p>
                          </div>
                          <Badge className={`${user.role === 'doctor' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-blue-500/20 text-blue-400'} text-xs`}>
                            {user.role}
                          </Badge>
                        </div>
                        
                        {/* Permission Buttons - Clear Row Layout */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* View Toggle */}
                          <button
                            onClick={() => handleToggleView(file.id, user.id, canView)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 min-w-[100px] justify-center ${
                              canView 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20' 
                                : `${isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-500 border border-slate-300'}`
                            }`}
                          >
                            {actionLoading === `${file.id}-${user.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : canView ? (
                              <>
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                                <Check className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4" />
                                <span>View</span>
                              </>
                            )}
                          </button>
                          
                          {/* Download Toggle */}
                          <button
                            onClick={() => handleToggleDownload(file.id, user.id, canDownload)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 min-w-[120px] justify-center ${
                              canDownload 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20' 
                                : `${isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-500 border border-slate-300'}`
                            }`}
                          >
                            {actionLoading === `${file.id}-${user.id}-dl` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : canDownload ? (
                              <>
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                                <Check className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Quick Actions Row */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/30">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGrantAll(file.id, user.id)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className="flex-1 h-8 text-emerald-400 hover:bg-emerald-500/20 text-xs"
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Grant All
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeAll(file.id, user.id)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className="flex-1 h-8 text-red-400 hover:bg-red-500/20 text-xs"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Revoke All
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {filteredUsers.length === 0 && (
                    <p className={`text-center py-4 ${textSecondary} col-span-2`}>No students or doctors found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <Files className={`w-12 h-12 mx-auto mb-4 ${textSecondary}`} />
              <p className={textSecondary}>No files found</p>
            </div>
          )}
        </div>
      )}

      {/* Content - Users View */}
      {viewMode === 'users' && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className={`${bgCard} ${borderColor} rounded-xl overflow-hidden`}>
              <CardContent className="p-4">
                {/* User Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${user.role === 'doctor' ? 'bg-purple-500/20' : 'bg-blue-500/20'} flex items-center justify-center`}>
                      {getUserIcon(user.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${textPrimary}`}>{user.name || 'Unnamed'}</p>
                        <Badge className={`${user.role === 'doctor' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500'} text-white text-xs`}>
                          {user.role}
                        </Badge>
                      </div>
                      <p className={`text-xs ${textSecondary}`}>{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${borderColor} ${textSecondary}`}>
                    {files.length} files
                  </Badge>
                </div>
                
                {/* Files List - Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredFiles.map((file) => {
                    const perm = getPermission(file.id, user.id)
                    const canView = perm?.can_view || false
                    const canDownload = perm?.can_download || false
                    
                    return (
                      <div 
                        key={file.id}
                        className={`p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${borderColor}`}
                      >
                        {/* File Info Row */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${textPrimary} text-sm truncate`}>{file.name}</p>
                            <p className={`text-xs ${textSecondary}`}>{file.type || 'File'}</p>
                          </div>
                        </div>
                        
                        {/* Permission Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* View Toggle */}
                          <button
                            onClick={() => handleToggleView(file.id, user.id, canView)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 min-w-[90px] justify-center ${
                              canView 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20' 
                                : `${isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-500 border border-slate-300'}`
                            }`}
                          >
                            {actionLoading === `${file.id}-${user.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : canView ? (
                              <>
                                <Eye className="w-4 h-4" />
                                <Check className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4" />
                              </>
                            )}
                          </button>
                          
                          {/* Download Toggle */}
                          <button
                            onClick={() => handleToggleDownload(file.id, user.id, canDownload)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 min-w-[90px] justify-center ${
                              canDownload 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20' 
                                : `${isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-500 border border-slate-300'}`
                            }`}
                          >
                            {actionLoading === `${file.id}-${user.id}-dl` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : canDownload ? (
                              <>
                                <Download className="w-4 h-4" />
                                <Check className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4" />
                              </>
                            )}
                          </button>
                          
                          {/* Quick Actions */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGrantAll(file.id, user.id)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/20"
                            title="Grant All"
                          >
                            <Unlock className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeAll(file.id, user.id)}
                            disabled={actionLoading?.startsWith(`${file.id}-${user.id}`)}
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                            title="Revoke All"
                          >
                            <Lock className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {filteredFiles.length === 0 && (
                    <p className={`text-center py-4 ${textSecondary} col-span-2`}>No files found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className={`w-12 h-12 mx-auto mb-4 ${textSecondary}`} />
              <p className={textSecondary}>No students or doctors found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
