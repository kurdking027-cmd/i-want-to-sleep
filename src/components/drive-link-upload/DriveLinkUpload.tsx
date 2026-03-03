'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage, translations } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { 
  Upload, 
  Link, 
  Loader2, 
  Cloud, 
  FileUp, 
  CheckCircle,
  FileText,
  Image,
  Video,
  Music,
  FileSpreadsheet,
  Presentation,
  File,
  Folder
} from 'lucide-react'

interface DriveLinkUploadProps {
  userId: string
  userRole: string
  currentFolderId: string | null
  onUploadComplete: () => void
}

export function DriveLinkUpload({ userId, currentFolderId, onUploadComplete }: DriveLinkUploadProps) {
  const { language } = useLanguage()
  const { resolvedTheme } = useTheme()
  
  const [driveLink, setDriveLink] = useState('')
  const [linkName, setLinkName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('drive')
  const [success, setSuccess] = useState(false)
  const [selectedType, setSelectedType] = useState('drive_link')

  // Translation helper
  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    return translation[language] || translation.en || key
  }

  // Theme-based styling
  const isDark = resolvedTheme === 'dark'
  const bgCard = isDark ? 'bg-slate-800' : 'bg-slate-100'
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200'
  const textPrimary = isDark ? 'text-white' : 'text-slate-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const inputBg = isDark ? 'bg-slate-900/50' : 'bg-slate-50'

  const fileCategories = [
    { id: 'drive_link', label: t('driveLink'), icon: Link, color: 'text-teal-400' },
    { id: 'pdf', label: t('pdfDocument'), icon: FileText, color: 'text-red-400' },
    { id: 'image', label: t('image'), icon: Image, color: 'text-purple-400' },
    { id: 'video', label: t('video'), icon: Video, color: 'text-pink-400' },
    { id: 'audio', label: t('audio'), icon: Music, color: 'text-indigo-400' },
    { id: 'spreadsheet', label: t('spreadsheet'), icon: FileSpreadsheet, color: 'text-emerald-400' },
    { id: 'presentation', label: t('presentation'), icon: Presentation, color: 'text-orange-400' },
    { id: 'document', label: t('document'), icon: File, color: 'text-blue-400' },
  ]

  const handleAddDriveLink = async () => {
    if (!driveLink.trim() || !linkName.trim()) {
      alert('Please provide both a name and URL')
      return
    }

    setUploading(true)
    setSuccess(false)
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkName.trim(),
          type: selectedType,
          url: driveLink.trim(),
          folderId: currentFolderId,
          userId
        })
      })

      if (response.ok) {
        setDriveLink('')
        setLinkName('')
        setSuccess(true)
        onUploadComplete()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add drive link')
      }
    } catch (error) {
      console.error('Error adding drive link:', error)
      alert('Failed to add drive link')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{t('resourceAddedSuccess')}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} p-1 rounded-xl`}>
          <TabsTrigger 
            value="drive" 
            className={`flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white ${textSecondary}`}
          >
            <Cloud className="w-4 h-4" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger 
            value="file" 
            className={`flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white ${textSecondary}`}
          >
            <FileUp className="w-4 h-4" />
            Upload File
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drive" className="space-y-5 mt-5">
          <div className="space-y-3">
            <Label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
              {t('resourceName')}
            </Label>
            <Input
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder={language === 'ku' ? 'بۆ نموونە: وتاری کاردیۆلۆژی - هەفتەی ٥' : 
                           language === 'ar' ? 'مثال: محاضرة أمراض القلب - الأسبوع 5' : 
                           'e.g., Cardiology Lecture Notes - Week 5'}
              className={`${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500 h-12`}
            />
          </div>
          
          <div className="space-y-3">
            <Label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
              {t('googleDriveUrl')}
            </Label>
            <div className="relative">
              <Link className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
              <Input
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className={`pl-12 ${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500 h-12`}
              />
            </div>
          </div>

          {/* File Type Categorization */}
          <div className="space-y-3">
            <Label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
              {t('fileCategory')}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {fileCategories.map((category) => {
                const IconComponent = category.icon
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedType(category.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      selectedType === category.id
                        ? 'border-teal-500 bg-teal-500/20'
                        : `${borderColor} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} hover:border-slate-600`
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${selectedType === category.id ? 'text-teal-400' : category.color}`} />
                    <span className={`text-xs ${selectedType === category.id ? 'text-teal-400' : textSecondary}`}>
                      {category.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Current Folder Indicator */}
          {currentFolderId && (
            <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} border ${borderColor}`}>
              <Folder className="w-4 h-4 text-teal-400" />
              <span className={`text-sm ${textSecondary}`}>Uploading to selected folder</span>
            </div>
          )}

          <Button
            onClick={handleAddDriveLink}
            disabled={uploading || !driveLink.trim() || !linkName.trim()}
            className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/20 font-semibold uppercase tracking-wide"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                <Cloud className="w-5 h-5 mr-2" />
                {t('addDriveLink')}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="file" className="space-y-5 mt-5">
          <div className={`border-2 border-dashed ${borderColor} rounded-2xl p-10 text-center hover:border-teal-500/50 transition-colors cursor-pointer`}>
            <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'} flex items-center justify-center border ${borderColor}`}>
              <Upload className={`w-8 h-8 ${textSecondary}`} />
            </div>
            <p className={`${textPrimary} font-medium mb-2`}>
              File uploads coming soon
            </p>
            <p className={`text-sm ${textSecondary} max-w-xs mx-auto`}>
              For now, please upload files to Google Drive and share the link using the tab above
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
