'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage, translations } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { 
  Folder, 
  ChevronRight, 
  ExternalLink, 
  Trash2, 
  FolderPlus,
  Loader2,
  FolderOpen,
  Grid,
  List,
  Lock,
  FileText,
  File,
  Image,
  Video,
  Music,
  Archive,
  Code,
  FileSpreadsheet,
  Presentation,
  Link,
  Eye,
  Download,
  EyeOff,
  Ban,
  HelpCircle,
  ClipboardCheck
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'drive_link'
  url: string
  folder_id: string | null
  uploaded_by: string
  created_at: string
}

interface FolderItem {
  id: string
  name: string
  parent_id: string | null
  created_by: string
  created_at: string
}

interface FilePermission {
  file_id: string
  can_view: boolean
  can_download: boolean
}

interface FileViewInfo {
  id: string
  name: string
  url: string
  type: string
  canView: boolean
  canDownload: boolean
}

interface FileManagerProps {
  userId: string
  userRole: string
  currentFolderId: string | null
  setCurrentFolderId: (id: string | null) => void
  onViewFile?: (file: FileViewInfo) => void
}

// File type detection and icon mapping
const getFileTypeInfo = (file: FileItem) => {
  const name = file.name.toLowerCase()
  const url = file.url.toLowerCase()
  
  // MCQ (Multiple Choice Questions)
  if (name.includes('mcq') || name.includes('quiz') || name.includes('multiple choice') || 
      url.includes('mcq') || url.includes('quiz')) {
    return { icon: HelpCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'MCQ' }
  }
  
  // TEST
  if (name.includes('test') || name.includes('exam') || name.includes('assessment') || 
      url.includes('test') || url.includes('exam')) {
    return { icon: ClipboardCheck, color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'TEST' }
  }
  
  // PDF
  if (name.endsWith('.pdf') || url.includes('pdf')) {
    return { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/20', label: 'PDF' }
  }
  
  // Images
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name) || url.includes('image')) {
    return { icon: Image, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Image' }
  }
  
  // Videos
  if (/\.(mp4|avi|mov|wmv|flv|mkv|webm|m4v)$/i.test(name) || url.includes('video') || url.includes('youtube') || url.includes('vimeo')) {
    return { icon: Video, color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Video' }
  }
  
  // Audio
  if (/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(name) || url.includes('audio')) {
    return { icon: Music, color: 'text-indigo-400', bg: 'bg-indigo-500/20', label: 'Audio' }
  }
  
  // Archives
  if (/\.(zip|rar|7z|tar|gz|bz2)$/i.test(name)) {
    return { icon: Archive, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Archive' }
  }
  
  // Code
  if (/\.(js|ts|jsx|tsx|py|java|cpp|c|h|cs|go|rs|php|rb|swift|kt)$/i.test(name)) {
    return { icon: Code, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Code' }
  }
  
  // Spreadsheets
  if (/\.(xlsx|xls|csv|ods)$/i.test(name) || url.includes('spreadsheet') || url.includes('sheet')) {
    return { icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Spreadsheet' }
  }
  
  // Presentations
  if (/\.(ppt|pptx|odp|key)$/i.test(name) || url.includes('presentation') || url.includes('slides')) {
    return { icon: Presentation, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Presentation' }
  }
  
  // Documents
  if (/\.(doc|docx|txt|rtf|odt)$/i.test(name) || url.includes('document')) {
    return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Document' }
  }
  
  // Google Drive Link (default for drive links)
  if (file.type === 'drive_link') {
    return { icon: Link, color: 'text-teal-400', bg: 'bg-teal-500/20', label: 'Drive Link' }
  }
  
  // Default file
  return { icon: File, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'File' }
}

export function FileManager({ userId, userRole, currentFolderId, setCurrentFolderId, onViewFile }: FileManagerProps) {
  const { language } = useLanguage()
  const { resolvedTheme } = useTheme()
  
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [folderPath, setFolderPath] = useState<FolderItem[]>([])
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filePermissions, setFilePermissions] = useState<Map<string, FilePermission>>(new Map())
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null)

  // Check if user is student or doctor (needs permission check)
  const needsPermissionCheck = userRole === 'student' || userRole === 'doctor'

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
  const inputBg = isDark ? 'bg-slate-900' : 'bg-slate-50'
  const dialogBg = isDark ? 'bg-slate-800' : 'bg-white'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch folders
      const foldersUrl = `/api/folders?userId=${userId}${currentFolderId ? `&parentId=${currentFolderId}` : ''}`
      const foldersRes = await fetch(foldersUrl)
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        setFolders(foldersData)
      }

      // Fetch files
      const filesUrl = `/api/files?userId=${userId}${currentFolderId ? `&folderId=${currentFolderId}` : ''}`
      const filesRes = await fetch(filesUrl)
      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData)
        
        // Fetch file permissions for students and doctors
        if ((userRole === 'student' || userRole === 'doctor') && filesData.length > 0) {
          const permRes = await fetch(`/api/file-permissions?userId=${userId}`)
          if (permRes.ok) {
            const permData = await permRes.json()
            const permMap = new Map<string, FilePermission>()
            permData.forEach((p: FilePermission) => {
              permMap.set(p.file_id, p)
            })
            setFilePermissions(permMap)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, currentFolderId, userRole])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const navigateToFolder = (folder: FolderItem) => {
    setFolderPath(prev => [...prev, folder])
    setCurrentFolderId(folder.id)
  }

  const navigateUp = () => {
    if (folderPath.length > 0) {
      const newPath = folderPath.slice(0, -1)
      setFolderPath(newPath)
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return

    setCreating(true)
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
          userId
        })
      })

      if (response.ok) {
        const newFolder = await response.json()
        setFolders(prev => [...prev, newFolder])
        setNewFolderName('')
        setShowNewFolderDialog(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder')
    } finally {
      setCreating(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm(t('confirm') + '?')) return

    try {
      const response = await fetch(`/api/files?fileId=${fileId}&userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const deleteFolder = async (folderId: string) => {
    if (!confirm(t('confirm') + '?')) return

    try {
      const response = await fetch(`/api/folders?folderId=${folderId}&userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFolders(prev => prev.filter(f => f.id !== folderId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const handleViewFile = (file: FileItem) => {
    // Check permission for students and doctors
    if (needsPermissionCheck) {
      const permission = filePermissions.get(file.id)
      if (!permission || !permission.can_view) {
        setPermissionDenied(file.name)
        setTimeout(() => setPermissionDenied(null), 3000)
        return
      }
      
      if (onViewFile) {
        onViewFile({
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type,
          canView: permission.can_view,
          canDownload: permission.can_download
        })
      } else {
        window.open(file.url, '_blank')
      }
    } else {
      // Admin/manager has full access
      if (onViewFile) {
        onViewFile({
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type,
          canView: true,
          canDownload: true
        })
      } else {
        window.open(file.url, '_blank')
      }
    }
  }

  // Check if file can be downloaded
  const canDownloadFile = (file: FileItem): boolean => {
    if (!needsPermissionCheck) return true
    const permission = filePermissions.get(file.id)
    return permission?.can_download ?? false
  }

  const canCreateFolder = userRole === 'admin' || userRole === 'manager'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
          <p className={textSecondary}>{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFolderPath([])
              setCurrentFolderId(null)
            }}
            className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            {t('root')}
          </Button>
          
          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1)
                  setFolderPath(newPath)
                  setCurrentFolderId(folder.id)
                }}
                className={`${textSecondary} hover:text-white`}
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>

        {/* View Toggle */}
        <div className={`flex items-center gap-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-lg p-1`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={`h-8 w-8 p-0 ${viewMode === 'grid' ? `${isDark ? 'bg-slate-700' : 'bg-slate-300'} text-teal-400` : textSecondary}`}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={`h-8 w-8 p-0 ${viewMode === 'list' ? `${isDark ? 'bg-slate-700' : 'bg-slate-300'} text-teal-400` : textSecondary}`}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {folderPath.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={navigateUp}
              className={`${borderColor} ${textSecondary} ${hoverBg}`}
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
              {t('back')}
            </Button>
          )}
        </div>

        {canCreateFolder && (
          <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/20">
                <FolderPlus className="w-4 h-4 mr-1" />
                {t('newFolder')}
              </Button>
            </DialogTrigger>
            <DialogContent className={`${dialogBg} ${borderColor}`}>
              <DialogHeader>
                <DialogTitle className={textPrimary}>{t('newFolder')}</DialogTitle>
                <DialogDescription className={textSecondary}>
                  {t('newFolder')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={t('newFolder')}
                  className={`${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500`}
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewFolderDialog(false)}
                  className={`${borderColor} ${textSecondary}`}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={createFolder} 
                  disabled={creating || !newFolderName.trim()}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                >
                  {creating ? t('loading') : t('confirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Folders */}
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className={`group cursor-pointer ${bgCard} ${borderColor} rounded-xl hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10 transition-all relative overflow-hidden`}
            >
              <CardContent className="p-4">
                <div 
                  className="flex flex-col items-center text-center"
                  onClick={() => navigateToFolder(folder)}
                >
                  <div className="w-14 h-14 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Folder className="w-7 h-7 text-teal-400" />
                  </div>
                  <p className={`text-sm font-medium ${textPrimary} truncate w-full`}>
                    {folder.name}
                  </p>
                </div>
                {canCreateFolder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFolder(folder.id)
                    }}
                    className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Files with categorized icons */}
          {files.map((file) => {
            const fileInfo = getFileTypeInfo(file)
            const IconComponent = fileInfo.icon
            
            return (
              <Card
                key={file.id}
                className={`group cursor-pointer ${bgCard} ${borderColor} rounded-xl hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all relative overflow-hidden`}
              >
                <CardContent className="p-4">
                  <div
                    onClick={() => handleViewFile(file)}
                    className="flex flex-col items-center text-center"
                  >
                    <div className={`w-14 h-14 rounded-xl ${fileInfo.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <IconComponent className={`w-7 h-7 ${fileInfo.color}`} />
                    </div>
                    <p className={`text-sm font-medium ${textPrimary} truncate w-full`}>
                      {file.name}
                    </p>
                    <Badge variant="outline" className={`mt-2 text-xs ${borderColor} ${textSecondary}`}>
                      {fileInfo.label}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleViewFile(file)}
                      className={`h-7 w-7 flex items-center justify-center ${textSecondary} hover:text-teal-400 hover:bg-teal-500/10 rounded-lg`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.id)}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {/* Folders */}
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`group flex items-center justify-between p-3 rounded-xl ${bgCard} border ${borderColor} hover:border-teal-500/50 cursor-pointer transition-all`}
              onClick={() => navigateToFolder(folder)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-teal-400" />
                </div>
                <span className={`${textPrimary} font-medium`}>{folder.name}</span>
              </div>
              {canCreateFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFolder(folder.id)
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Files with categorized icons */}
          {files.map((file) => {
            const fileInfo = getFileTypeInfo(file)
            const IconComponent = fileInfo.icon
            
            return (
              <div
                key={file.id}
                className={`group flex items-center justify-between p-3 rounded-xl ${bgCard} border ${borderColor} hover:border-emerald-500/50 transition-all`}
              >
                <div
                  onClick={() => handleViewFile(file)}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-lg ${fileInfo.bg} flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${fileInfo.color}`} />
                  </div>
                  <div>
                    <span className={`${textPrimary} font-medium`}>{file.name}</span>
                    <Badge variant="outline" className={`ml-2 text-xs ${borderColor} ${textSecondary}`}>
                      {fileInfo.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleViewFile(file)}
                    className={`h-8 w-8 flex items-center justify-center ${textSecondary} hover:text-teal-400 hover:bg-teal-500/10 rounded-lg`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && (
        <div className="text-center py-16">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'} flex items-center justify-center border ${borderColor}`}>
            <Lock className="w-10 h-10 text-slate-600" />
          </div>
          <p className={`text-lg font-medium ${textSecondary}`}>{t('emptyDirectory')}</p>
          <p className={`text-sm ${textSecondary} mt-1`}>{t('noFilesFolders')}</p>
        </div>
      )}
    </div>
  )
}
