'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileManager } from '@/components/file-manager/FileManager'
import { DriveLinkUpload } from '@/components/drive-link-upload/DriveLinkUpload'
import { PermissionManager } from '@/components/permission-manager/PermissionManager'
import { MediMateAI } from '@/components/medi-mate-ai/MediMateAI'
import { UserManagementPanel } from '@/components/file-manager/UserManagementPanel'
import { FilePermissionsPanel } from '@/components/file-manager/FilePermissionsPanel'
import { DeviceManagementPanel } from '@/components/device-management/DeviceManagementPanel'
import { useLanguage, translations } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { PDFViewer } from '@/components/pdf-viewer/PDFViewer'
import { 
  Heart, 
  Shield, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Lock,
  Stethoscope,
  Brain,
  Users,
  FolderOpen,
  Settings,
  Sparkles,
  GraduationCap,
  Crown,
  Database,
  Menu,
  X,
  Globe,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  Languages,
  Palette,
  Check,
  ChevronDown,
  Activity,
  Welcome,
  FileLock,
  MessageCircle,
  Mail,
  UsersRound,
  FileText
} from 'lucide-react'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: string
}

type AuthView = 'login' | 'signup'

// Super admin email - only this account can manage other admins
const SUPER_ADMIN_EMAIL = 'anashawleri67@gmail.com'

export default function Home() {
  const { language, setLanguage, isRTL, mounted: languageMounted } = useLanguage()
  const { theme, setTheme, resolvedTheme, mounted: themeMounted } = useTheme()
  
  const [user, setUser] = useState<User | null>(null)
  const [managerPermissions, setManagerPermissions] = useState<{ canUploadFiles: boolean } | null>(null)
  const [view, setView] = useState<AuthView>('login')
  const [formData, setFormData] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'files' | 'users' | 'permissions' | 'filePermissions' | 'devices'>('files')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewingFile, setViewingFile] = useState<{id: string, name: string, url: string, type: string, canView: boolean, canDownload: boolean} | null>(null)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [devicePending, setDevicePending] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('')

  // Check if both contexts are mounted
  const isFullyMounted = languageMounted && themeMounted

  // Generate device fingerprint
  useEffect(() => {
    const generateFingerprint = () => {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || '',
      ]
      const fingerprint = components.join('|')
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return Math.abs(hash).toString(36)
    }
    
    let fp = localStorage.getItem('medicore_device_fp')
    if (!fp) {
      fp = generateFingerprint()
      localStorage.setItem('medicore_device_fp', fp)
    }
    setDeviceFingerprint(fp)
  }, [])

  // Translation helper - use English during SSR to avoid hydration mismatch
  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    // Always return English during SSR to avoid hydration mismatch
    if (!languageMounted) return translation.en || key
    return translation[language] || translation.en || key
  }

  // Language options
  const languageOptions = [
    { code: 'en' as const, name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'ku' as const, name: 'Kurdish Sorani', nativeName: 'کوردی سۆرانی', flag: '☀️' },
    { code: 'ar' as const, name: 'Iraqi Arabic', nativeName: 'العربية العراقية', flag: '🇮🇶' },
    { code: 'tk' as const, name: 'Iraqi Turkmeni', nativeName: 'ترکمانی عراق', flag: '🌙' }
  ]

  // Theme options
  const themeOptions = [
    { code: 'light' as const, name: t('light'), icon: Sun },
    { code: 'dark' as const, name: t('dark'), icon: Moon },
    { code: 'system' as const, name: t('system'), icon: Monitor }
  ]

  // Check if current user is super admin
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL

  // Load saved user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem('medicore_user')
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser))
          } catch (e) {
            localStorage.removeItem('medicore_user')
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [])

  // Fetch manager permissions for managers
  useEffect(() => {
    if (user && user.role === 'manager') {
      const fetchManagerPermissions = async () => {
        try {
          const response = await fetch(`/api/manager-permissions-supabase?managerId=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            setManagerPermissions(data)
          }
        } catch (error) {
          console.error('Error fetching manager permissions:', error)
        }
      }
      fetchManagerPermissions()
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (view === 'login') {
        // Get device info
        const ua = navigator.userAgent
        let browser = 'Unknown'
        if (ua.includes('Firefox')) browser = 'Firefox'
        else if (ua.includes('Edg')) browser = 'Edge'
        else if (ua.includes('Chrome')) browser = 'Chrome'
        else if (ua.includes('Safari')) browser = 'Safari'
        
        let os = 'Unknown'
        if (ua.includes('Windows')) os = 'Windows'
        else if (ua.includes('Mac')) os = 'macOS'
        else if (ua.includes('Linux')) os = 'Linux'
        else if (ua.includes('Android')) os = 'Android'
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            password: formData.password,
            deviceFingerprint,
            deviceName: `${browser} on ${os}`,
            browser,
            os
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Authentication failed')
          setIsSubmitting(false)
          return
        }

        // Check if device is pending approval
        if (data.deviceStatus === 'pending') {
          setUser(data)
          setDevicePending(true)
          localStorage.setItem('medicore_user', JSON.stringify(data))
          setIsSubmitting(false)
          return
        }

        setUser(data)
        localStorage.setItem('medicore_user', JSON.stringify(data))
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Signup failed')
          setIsSubmitting(false)
          return
        }

        setUser(data)
        localStorage.setItem('medicore_user', JSON.stringify(data))
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchView = (newView: AuthView) => {
    setView(newView)
    setFormData({ email: '', password: '', name: '' })
    setError(null)
  }

  // Get role-specific logo and styling
  const getRoleLogo = () => {
    if (!user) return { icon: GraduationCap, bg: 'from-teal-500 to-emerald-500', title: t('appName'), subtitle: t('eliteMedicalEducation') }
    
    switch (user.role) {
      case 'admin':
        return {
          icon: Crown,
          bg: isSuperAdmin ? 'from-amber-500 to-yellow-500' : 'from-emerald-500 to-green-500',
          title: isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN',
          subtitle: t('eliteMedicalEducation'),
          glow: isSuperAdmin ? 'shadow-amber-500/30' : 'shadow-emerald-500/30'
        }
      case 'manager':
        return {
          icon: Crown,
          bg: 'from-slate-700 to-slate-900',
          title: 'MANAGER',
          subtitle: t('eliteMedicalEducation'),
          iconColor: 'text-white',
          glow: 'shadow-slate-500/30'
        }
      case 'doctor':
        return {
          icon: Stethoscope,
          bg: 'from-purple-500 to-pink-500',
          title: 'MEDICORE DOCTOR',
          subtitle: t('eliteMedicalEducation'),
          glow: 'shadow-purple-500/30'
        }
      case 'student':
        return {
          icon: GraduationCap,
          bg: 'from-blue-500 to-cyan-500',
          title: 'MEDICORE STUDENT',
          subtitle: t('eliteMedicalEducation'),
          glow: 'shadow-blue-500/30'
        }
      default:
        return {
          icon: GraduationCap,
          bg: 'from-teal-500 to-emerald-500',
          title: t('appName'),
          subtitle: t('eliteMedicalEducation'),
          glow: 'shadow-teal-500/30'
        }
    }
  }

  // Theme-based styling
  const isDark = resolvedTheme === 'dark'
  const bgMain = isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
  const bgCard = isDark ? 'bg-slate-800/80' : 'bg-white/90'
  const bgCardSolid = isDark ? 'bg-slate-800' : 'bg-white'
  const bgHeader = isDark ? 'bg-slate-800/80' : 'bg-white/90'
  const textPrimary = isDark ? 'text-white' : 'text-slate-900'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200'
  const inputBg = isDark ? 'bg-slate-900/50' : 'bg-slate-50'
  const hoverBg = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'

  const roleLogo = getRoleLogo()
  const RoleIcon = roleLogo.icon

  // Check if user is student or doctor
  const isStudentOrDoctor = user?.role === 'student' || user?.role === 'doctor'

  // LOADING SCREEN
  if (isLoading || !isFullyMounted) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgMain}`}>
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
            <div className={`absolute inset-0 bg-gradient-to-br ${roleLogo.bg} rounded-3xl animate-pulse opacity-50 blur-xl`}></div>
            <div className={`relative w-20 h-20 bg-gradient-to-br ${roleLogo.bg} rounded-2xl flex items-center justify-center shadow-lg ${roleLogo.glow || 'shadow-teal-500/30'}`}>
              <RoleIcon className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className={`text-4xl font-bold mb-3 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent`}>
            MEDICORE ACADEMY
          </h1>
          <p className={`${textSecondary} flex items-center justify-center gap-2 text-lg`}>
            <Shield className="w-5 h-5 animate-pulse" />
            Loading...
          </p>
        </div>
      </div>
    )
  }

  // AUTH SCREEN
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgMain} relative overflow-hidden`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Medical Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 text-teal-500/20 animate-bounce" style={{ animationDuration: '6s' }}>
            <Stethoscope className="w-12 h-12" />
          </div>
          <div className="absolute top-40 right-40 text-emerald-500/20 animate-bounce" style={{ animationDuration: '7s', animationDelay: '1s' }}>
            <Heart className="w-10 h-10" />
          </div>
          <div className="absolute bottom-40 left-40 text-cyan-500/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }}>
            <Brain className="w-14 h-14" />
          </div>
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${isDark ? 'bg-teal-500/10' : 'bg-teal-500/5'} rounded-full blur-3xl animate-pulse`} style={{ animationDuration: '8s' }}></div>
          <div className={`absolute top-1/3 right-1/4 w-80 h-80 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/5'} rounded-full blur-3xl animate-pulse`} style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        </div>

        <Card className={`${bgCard} backdrop-blur-xl w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${borderColor} relative z-10`}>
          <div className="relative p-8 text-center overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${roleLogo.bg} opacity-10`}></div>
            <div className="relative">
              <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${roleLogo.bg} rounded-2xl mb-4 shadow-lg ${roleLogo.glow || 'shadow-teal-500/30'}`}>
                <RoleIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className={`text-3xl font-bold ${textPrimary}`}>
                {t('appName')}
              </h1>
              <p className="text-teal-400 text-sm mt-2 font-medium tracking-wide uppercase">
                {t('eliteMedicalEducation')}
              </p>
            </div>
          </div>
          
          <form onSubmit={handleAuth} className="p-8 space-y-5">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                <AlertDescription className="text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {view === 'signup' && (
              <div className="space-y-2">
                <Label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                  {t('fullName')}
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Dr. Jane Smith"
                  className={`${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500 focus-visible:border-teal-500`}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                {t('email')}
              </Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@medicore.edu"
                className={`${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500 focus-visible:border-teal-500`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                {t('password')}
              </Label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className={`${inputBg} ${borderColor} ${textPrimary} placeholder:text-slate-500 focus-visible:ring-teal-500 focus-visible:border-teal-500`}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-6 font-bold rounded-xl uppercase tracking-wider transition-all ${
                isSubmitting
                  ? 'bg-slate-700 cursor-not-allowed'
                  : `bg-gradient-to-r ${roleLogo.bg} text-white hover:shadow-lg ${roleLogo.glow || 'shadow-teal-500/30'} hover:-translate-y-0.5`
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" />
                  {view === 'login' ? '...' : '...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {view === 'login' ? t('secureLogin') : t('signup')}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
              disabled={isSubmitting}
              className={`w-full text-sm font-semibold text-teal-400 hover:text-teal-300 ${hoverBg} uppercase`}
            >
              {view === 'login' ? t('createNewAccount') : t('returnToLogin')}
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  // WAITING SCREEN (For Pending Students/Doctors)
  if ((user.role === 'student' || user.role === 'doctor') && user.status === 'pending') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${bgMain} p-6 text-center`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl mb-8 shadow-lg shadow-amber-500/30`}>
          <Shield className="w-12 h-12 text-white" />
        </div>
        <h1 className={`text-4xl font-bold mb-4 ${textPrimary}`}>
          {t('awaitingApproval')}
        </h1>
        <p className={`${textSecondary} max-w-md text-lg mb-8`}>
          {t('accountPending')}
        </p>
        <Card className={`${bgCard} ${borderColor} rounded-3xl p-6 max-w-md mx-auto`}>
          <p className="font-bold text-teal-400 mb-4 flex items-center gap-2 justify-center">
            <CheckCircle className="w-5 h-5" />
            {t('verificationProcess')}
          </p>
          <ul className={`space-y-3 ${textSecondary} text-sm text-left`}>
            <li className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <span className="text-teal-400 text-xs font-bold">1</span>
              </div>
              <span>{t('verificationStep1')}</span>
            </li>
            <li className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <span className="text-teal-400 text-xs font-bold">2</span>
              </div>
              <span>{t('verificationStep2')}</span>
            </li>
            <li className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <span className="text-teal-400 text-xs font-bold">3</span>
              </div>
              <span>{t('verificationStep3')}</span>
            </li>
          </ul>
        </Card>
        <Button
          onClick={() => {
            setUser(null)
            localStorage.removeItem('medicore_user')
          }}
          variant="outline"
          className="mt-12 border-teal-500/50 text-teal-400 hover:bg-teal-500/10 rounded-xl px-8"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('signOut')}
        </Button>
      </div>
    )
  }

  // DEVICE PENDING SCREEN (For Students/Doctors on new device)
  if (devicePending && user && (user.role === 'student' || user.role === 'doctor')) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${bgMain} p-6 text-center`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl mb-8 shadow-lg shadow-blue-500/30`}>
          <Monitor className="w-12 h-12 text-white" />
        </div>
        <h1 className={`text-4xl font-bold mb-4 ${textPrimary}`}>
          {language === 'ku' ? 'ئامێرەکەت چاوەڕوانی پەسەندکردنە' : 
           language === 'ar' ? 'جهازك في انتظار الموافقة' : 
           language === 'tk' ? 'ئوتقولو گؤزلین' : 
           'Device Pending Approval'}
        </h1>
        <p className={`${textSecondary} max-w-md text-lg mb-8`}>
          {language === 'ku' ? 'ئەم ئامێرە نوێیە پێویستی بە پەسەندکردنی بەڕێوەبەر هەیە پێش ئەوەی بتوانیت بچیتە ناوەوە.' :
           language === 'ar' ? 'هذا الجهاز الجديد يحتاج إلى موافقة المسؤول قبل أن تتمكن من تسجيل الدخول.' :
           language === 'tk' ? 'بو یئنی ئوتقول ایدارەچی تصدیقی لازیمدیر.' :
           'This new device requires admin approval before you can access your account.'}
        </p>
        <Card className={`${bgCard} ${borderColor} rounded-3xl p-6 max-w-md mx-auto`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center`}>
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <p className={`font-bold ${textPrimary}`}>{language === 'ku' ? 'ئامێری نوێ' : language === 'ar' ? 'جهاز جديد' : language === 'tk' ? 'یئنی ئوتقول' : 'New Device Detected'}</p>
              <p className={`text-sm ${textSecondary}`}>{navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
            </div>
          </div>
          <p className={`${textSecondary} text-sm`}>
            {language === 'ku' ? 'تکایە چاوەڕوانی پەسەندکردن بکە یان پەیوەندی بکە بە بەڕێوەبەرەوە.' :
             language === 'ar' ? 'يرجى الانتظار للموافقة أو الاتصال بالمسؤول.' :
             language === 'tk' ? 'تکایە تصدیق گؤزلین یا ایدارەچیله‌ علاقه‌ قورun.' :
             'Please wait for approval or contact your administrator.'}
          </p>
        </Card>
        <Button
          onClick={() => {
            setUser(null)
            setDevicePending(false)
            localStorage.removeItem('medicore_user')
          }}
          variant="outline"
          className="mt-12 border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl px-8"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('signOut')}
        </Button>
      </div>
    )
  }

  // Check if file is a PDF
  const isPDFFile = (file: { name: string; url: string; type: string }) => {
    const pdfExtensions = ['.pdf', 'pdf']
    const name = file.name.toLowerCase()
    const type = file.type?.toLowerCase() || ''
    
    // Check file extension
    if (pdfExtensions.some(ext => name.endsWith(ext))) return true
    // Check type
    if (type === 'pdf' || type.includes('pdf')) return true
    // Check URL for PDF indicator
    if (file.url.toLowerCase().includes('pdf') || file.url.toLowerCase().endsWith('.pdf')) return true
    
    return false
  }

  // WEB VIEW MODAL
  const WebViewModal = () => {
    if (!viewingFile) return null

    // Check if this is a view-only PDF (can view but cannot download)
    const isViewOnlyPDF = isPDFFile(viewingFile) && viewingFile.canView && !viewingFile.canDownload
    
    // Use PDF viewer with tldraw only for view-only users
    if (isViewOnlyPDF) {
      return (
        <PDFViewer
          url={viewingFile.url}
          fileName={viewingFile.name}
          fileId={viewingFile.id}
          userId={user?.id || ''}
          onClose={() => setViewingFile(null)}
        />
      )
    }

    // For PDFs with download permission, use regular preview
    if (isPDFFile(viewingFile) && viewingFile.canDownload) {
      const fileId = viewingFile.url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      const embedUrl = fileId 
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : viewingFile.url
      
      return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
          <div className={`${bgCardSolid} border-b ${borderColor} p-4 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingFile(null)}
                className={`${textPrimary} ${hoverBg}`}
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                {t('back')}
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-400" />
                <span className={`${textPrimary} font-medium truncate max-w-md`}>{viewingFile.name}</span>
              </div>
            </div>
            <Badge variant="outline" className={`border-teal-500/50 text-teal-400`}>
              Full Access
            </Badge>
          </div>
          <div className="flex-1 w-full">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )
    }

    const isYouTube = viewingFile.url.includes('youtube.com') || viewingFile.url.includes('youtu.be')
    const isGoogleDrive = viewingFile.url.includes('drive.google.com')
    
    // Convert YouTube URL to embed
    let embedUrl = viewingFile.url
    if (isYouTube) {
      const videoId = viewingFile.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1]
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`
      }
    }

    // Convert Google Drive URL to preview
    if (isGoogleDrive) {
      const fileId = viewingFile.url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      if (fileId) {
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`
      }
    }

    return (
      <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
        {/* Header */}
        <div className={`${bgCardSolid} border-b ${borderColor} p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingFile(null)}
              className={`${textPrimary} ${hoverBg}`}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              {t('back')}
            </Button>
            <div className="flex items-center gap-2">
              {isYouTube ? (
                <Activity className="w-5 h-5 text-red-500" />
              ) : isGoogleDrive ? (
                <Globe className="w-5 h-5 text-teal-400" />
              ) : (
                <Database className="w-5 h-5 text-blue-400" />
              )}
              <span className={`${textPrimary} font-medium truncate max-w-md`}>{viewingFile.name}</span>
            </div>
          </div>
          <Badge variant="outline" className={`border ${borderColor} ${textSecondary}`}>
            Web View - No Direct Access
          </Badge>
        </div>
        
        {/* Content */}
        <div className="flex-1 w-full">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  // STUDENT/DOCTOR DASHBOARD
  if (isStudentOrDoctor) {
    return (
      <div className={`min-h-screen ${bgMain} flex flex-col`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Web View Modal */}
        <WebViewModal />

        {/* Header */}
        <header className={`${bgHeader} backdrop-blur-xl sticky top-0 z-50 border-b ${borderColor}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden ${textPrimary} ${hoverBg} mr-2`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>

              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${roleLogo.bg} rounded-xl flex items-center justify-center shadow-lg ${roleLogo.glow || 'shadow-teal-500/20'}`}>
                  <RoleIcon className={`w-7 h-7 ${roleLogo.iconColor || 'text-white'}`} />
                </div>
                <div className="hidden sm:block">
                  <h1 className={`text-xl font-bold ${textPrimary} tracking-wide`}>
                    {roleLogo.title}
                  </h1>
                  <p className={`text-xs ${textSecondary} tracking-wide uppercase`}>{roleLogo.subtitle}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`text-right hidden md:block ${isRTL ? 'text-left' : 'text-right'}`}>
                  <p className={`text-sm font-semibold ${textPrimary}`}>{user.name || user.email}</p>
                  <p className={`text-xs ${textSecondary}`}>{user.email}</p>
                </div>
                <Button
                  onClick={() => {
                    setUser(null)
                    localStorage.removeItem('medicore_user')
                  }}
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('signOut')}</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu - Only Language and Theme */}
        {mobileMenuOpen && (
          <div className={`lg:hidden ${bgCard} border-b ${borderColor} p-4`}>
            <div className="space-y-3">
              {/* Language Selector */}
              <div className="relative">
                <Button
                  onClick={() => { setShowLanguageMenu(!showLanguageMenu); setShowThemeMenu(false); }}
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${textSecondary} hover:text-white ${hoverBg}`}
                >
                  <Languages className="w-5 h-5" />
                  <span className="flex-1 text-left">{t('languages')}</span>
                  <span className="text-lg">{languageOptions.find(l => l.code === language)?.flag}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                </Button>
                
                {showLanguageMenu && (
                  <div className={`mt-1 ${bgCardSolid} border ${borderColor} rounded-xl overflow-hidden z-50 shadow-xl`}>
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors ${
                          language === lang.code ? 'bg-teal-500/20 text-teal-400' : textPrimary
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{lang.name}</p>
                          <p className={`text-xs ${textSecondary}`} dir={lang.code === 'ku' || lang.code === 'ar' ? 'rtl' : 'ltr'}>
                            {lang.nativeName}
                          </p>
                        </div>
                        {language === lang.code && <Check className="w-4 h-4 text-teal-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme Selector */}
              <div className="relative">
                <Button
                  onClick={() => { setShowThemeMenu(!showThemeMenu); setShowLanguageMenu(false); }}
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${textSecondary} hover:text-white ${hoverBg}`}
                >
                  <Palette className="w-5 h-5" />
                  <span className="flex-1 text-left">{t('themes')}</span>
                  {theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
                  {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
                  {theme === 'system' && <Monitor className="w-4 h-4 text-slate-400" />}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
                </Button>
                
                {showThemeMenu && (
                  <div className={`mt-1 ${bgCardSolid} border ${borderColor} rounded-xl overflow-hidden z-50 shadow-xl`}>
                    {themeOptions.map((t) => {
                      const IconComponent = t.icon
                      return (
                        <button
                          key={t.code}
                          onClick={() => { setTheme(t.code); setShowThemeMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors ${
                            theme === t.code ? 'bg-teal-500/20 text-teal-400' : textPrimary
                          }`}
                        >
                          <IconComponent className={`w-5 h-5 ${
                            t.code === 'light' ? 'text-amber-400' : 
                            t.code === 'dark' ? 'text-blue-400' : 
                            'text-slate-400'
                          }`} />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{t.name}</p>
                          </div>
                          {theme === t.code && <Check className="w-4 h-4 text-teal-400" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Direct Dashboard for Student/Doctor */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          {/* Welcome Banner */}
          <div className={`mb-8 p-6 rounded-2xl bg-gradient-to-r ${roleLogo.bg} shadow-lg ${roleLogo.glow}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <RoleIcon className={`w-8 h-8 ${roleLogo.iconColor || 'text-white'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {t('welcome')}, {(user.name || user.email).toUpperCase()}
                </h2>
                <p className="text-white/80 mt-1">
                  {user.role === 'student' ? t('welcomeStudent') : t('welcomeDoctor')}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-white/60 ml-auto animate-pulse hidden sm:block" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Manager */}
            <div className="lg:col-span-2">
              <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 bg-gradient-to-br ${roleLogo.bg} rounded-xl flex items-center justify-center`}>
                    <FolderOpen className={`w-5 h-5 ${roleLogo.iconColor || 'text-white'}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${textPrimary}`}>{t('fileManager')}</h2>
                    <p className={`text-xs ${textSecondary}`}>{t('addFilesDrive')}</p>
                  </div>
                </div>
                <FileManager
                  userId={user.id}
                  userRole={user.role}
                  currentFolderId={currentFolderId}
                  setCurrentFolderId={setCurrentFolderId}
                  onViewFile={(file) => setViewingFile(file)}
                />
              </Card>
            </div>

            {/* MediMate AI - Always Visible */}
            <div className="lg:col-span-1">
              <Card className={`${bgCard} ${borderColor} rounded-2xl overflow-hidden`}>
                <div className={`p-4 border-b ${borderColor} bg-gradient-to-r ${roleLogo.bg} opacity-90`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center`}>
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">MediMate AI</h3>
                      <p className="text-xs text-white/70">50+ Languages • GLM-5</p>
                    </div>
                    <Sparkles className="w-4 h-4 text-white ml-auto animate-pulse" />
                  </div>
                </div>
                <div className="p-4">
                  <MediMateAI />
                </div>
              </Card>

              {/* Desktop Language and Theme Controls */}
              <Card className={`${bgCard} ${borderColor} rounded-2xl p-4 mt-4 hidden lg:block`}>
                <div className="space-y-3">
                  {/* Language Selector */}
                  <div className="relative">
                    <Button
                      onClick={() => { setShowLanguageMenu(!showLanguageMenu); setShowThemeMenu(false); }}
                      variant="ghost"
                      className={`w-full justify-start gap-3 ${textSecondary} hover:text-white ${hoverBg}`}
                    >
                      <Languages className="w-5 h-5" />
                      <span className="flex-1 text-left">{t('languages')}</span>
                      <span className="text-lg">{languageOptions.find(l => l.code === language)?.flag}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showLanguageMenu && (
                      <div className={`absolute left-0 right-0 mt-1 ${bgCardSolid} border ${borderColor} rounded-xl overflow-hidden z-50 shadow-xl`}>
                        {languageOptions.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors ${
                              language === lang.code ? 'bg-teal-500/20 text-teal-400' : textPrimary
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <div className="flex-1 text-left">
                              <p className="font-medium">{lang.name}</p>
                              <p className={`text-xs ${textSecondary}`} dir={lang.code === 'ku' || lang.code === 'ar' ? 'rtl' : 'ltr'}>
                                {lang.nativeName}
                              </p>
                            </div>
                            {language === lang.code && <Check className="w-4 h-4 text-teal-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Theme Selector */}
                  <div className="relative">
                    <Button
                      onClick={() => { setShowThemeMenu(!showThemeMenu); setShowLanguageMenu(false); }}
                      variant="ghost"
                      className={`w-full justify-start gap-3 ${textSecondary} hover:text-white ${hoverBg}`}
                    >
                      <Palette className="w-5 h-5" />
                      <span className="flex-1 text-left">{t('themes')}</span>
                      {theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
                      {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
                      {theme === 'system' && <Monitor className="w-4 h-4 text-slate-400" />}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showThemeMenu && (
                      <div className={`absolute left-0 right-0 mt-1 ${bgCardSolid} border ${borderColor} rounded-xl overflow-hidden z-50 shadow-xl`}>
                        {themeOptions.map((t) => {
                          const IconComponent = t.icon
                          return (
                            <button
                              key={t.code}
                              onClick={() => { setTheme(t.code); setShowThemeMenu(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors ${
                                theme === t.code ? 'bg-teal-500/20 text-teal-400' : textPrimary
                              }`}
                            >
                              <IconComponent className={`w-5 h-5 ${
                                t.code === 'light' ? 'text-amber-400' : 
                                t.code === 'dark' ? 'text-blue-400' : 
                                'text-slate-400'
                              }`} />
                              <div className="flex-1 text-left">
                                <p className="font-medium">{t.name}</p>
                              </div>
                              {theme === t.code && <Check className="w-4 h-4 text-teal-400" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* Support Section - For Students and Doctors */}
        <div className="px-4 sm:px-6 lg:px-8 pb-6">
          <div className="max-w-7xl mx-auto">
            <Card className={`${bgCard} ${borderColor} rounded-2xl overflow-hidden`}>
              {/* Elite Header */}
              <div className="relative bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 p-6">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white tracking-wide">Need Help? We're Here For You</h3>
                    <p className="text-sm text-teal-200/70 mt-1">Premium Support • 24/7 Available</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-teal-300 animate-pulse" />
                </div>
              </div>
              
              {/* Buttons Container */}
              <div className="p-6 bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {/* Support Button */}
                  <a
                    href="https://t.me/Medicoresupport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-teal-500/25 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto">
                      <MessageCircle className="w-5 h-5" />
                      <span className="tracking-wide">SUPPORT</span>
                      <div className="absolute -right-1 -top-1 w-3 h-3 bg-emerald-300 rounded-full animate-ping"></div>
                      <div className="absolute -right-1 -top-1 w-3 h-3 bg-emerald-300 rounded-full"></div>
                    </div>
                  </a>

                  {/* Contact Us Button */}
                  <a
                    href="mailto:medicorestudies@gmail.com"
                    className="group relative w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto">
                      <Mail className="w-5 h-5" />
                      <span className="tracking-wide">CONTACT US</span>
                    </div>
                  </a>

                  {/* Follow Us Button */}
                  <a
                    href="https://t.me/+ZwX8Rf0jNLg3YzM6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto">
                      <UsersRound className="w-5 h-5" />
                      <span className="tracking-wide">FOLLOW US</span>
                      <Sparkles className="w-4 h-4 opacity-70" />
                    </div>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className={`${bgHeader} backdrop-blur-xl border-t ${borderColor} py-4 mt-auto`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <p className={`text-sm ${textSecondary}`}>
              {t('copyright')}
            </p>
            <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
              <Shield className="w-4 h-4" />
              <span>{t('hipaaCompliant')}</span>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // ADMIN/MANAGER DASHBOARD
  return (
    <div className={`min-h-screen ${bgMain} flex flex-col`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Web View Modal */}
      <WebViewModal />

      {/* Header */}
      <header className={`${bgHeader} backdrop-blur-xl sticky top-0 z-50 border-b ${borderColor}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden ${textPrimary} ${hoverBg} mr-2`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${roleLogo.bg} rounded-xl flex items-center justify-center shadow-lg ${roleLogo.glow || 'shadow-teal-500/20'}`}>
                <RoleIcon className={`w-7 h-7 ${roleLogo.iconColor || 'text-white'}`} />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-xl font-bold ${textPrimary} tracking-wide`}>
                  {roleLogo.title}
                </h1>
                <p className={`text-xs ${textSecondary} tracking-wide uppercase`}>{roleLogo.subtitle}</p>
              </div>
              <Badge className={`ml-2 bg-gradient-to-r ${roleLogo.bg} text-white border-transparent capitalize px-3 py-1`}>
                {t(user.role)}
                {isSuperAdmin && <Crown className="w-3 h-3 ml-1 inline" />}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`text-right hidden md:block ${isRTL ? 'text-left' : 'text-right'}`}>
                <p className={`text-sm font-semibold ${textPrimary}`}>{user.name || user.email}</p>
                <p className={`text-xs ${textSecondary}`}>{user.email}</p>
              </div>
              <Button
                onClick={() => {
                  setUser(null)
                  localStorage.removeItem('medicore_user')
                }}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('signOut')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className={`lg:col-span-1 space-y-4 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <Card className={`${bgCard} ${borderColor} rounded-2xl p-4`}>
              <nav className="space-y-2">
                <Button
                  onClick={() => { setActiveTab('files'); setMobileMenuOpen(false); }}
                  variant={activeTab === 'files' ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 ${activeTab === 'files' ? `bg-gradient-to-r ${roleLogo.bg} text-white` : `${textSecondary} hover:text-white ${hoverBg}`}`}
                >
                  <FolderOpen className="w-5 h-5" />
                  {t('fileManager')}
                </Button>
                
                {(user.role === 'admin' || user.role === 'manager') && (
                  <Button
                    onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                    variant={activeTab === 'users' ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${activeTab === 'users' ? `bg-gradient-to-r ${roleLogo.bg} text-white` : `${textSecondary} hover:text-white ${hoverBg}`}`}
                  >
                    <Users className="w-5 h-5" />
                    {t('userManagement')}
                  </Button>
                )}
                
                {(user.role === 'admin' || user.role === 'manager') && (
                  <Button
                    onClick={() => { setActiveTab('permissions'); setMobileMenuOpen(false); }}
                    variant={activeTab === 'permissions' ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${activeTab === 'permissions' ? `bg-gradient-to-r ${roleLogo.bg} text-white` : `${textSecondary} hover:text-white ${hoverBg}`}`}
                  >
                    <Settings className="w-5 h-5" />
                    {t('permissions')}
                  </Button>
                )}
                
                {/* File Permissions - Admin/Super Admin Only */}
                {(user.role === 'admin' || isSuperAdmin) && (
                  <Button
                    onClick={() => { setActiveTab('filePermissions'); setMobileMenuOpen(false); }}
                    variant={activeTab === 'filePermissions' ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${activeTab === 'filePermissions' ? `bg-gradient-to-r ${roleLogo.bg} text-white` : `${textSecondary} hover:text-white ${hoverBg}`}`}
                  >
                    <FileLock className="w-5 h-5" />
                    File Permissions
                  </Button>
                )}

                {/* Device Management - Admin/Super Admin Only */}
                {(user.role === 'admin' || isSuperAdmin) && (
                  <Button
                    onClick={() => { setActiveTab('devices'); setMobileMenuOpen(false); }}
                    variant={activeTab === 'devices' ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${activeTab === 'devices' ? `bg-gradient-to-r ${roleLogo.bg} text-white` : `${textSecondary} hover:text-white ${hoverBg}`}`}
                  >
                    <Monitor className="w-5 h-5" />
                    Device Management
                  </Button>
                )}

                {/* Divider */}
                <div className={`border-t ${borderColor} my-2`}></div>

                {/* Language Selector */}
                <div className="relative">
                  <Button
                    onClick={() => { setShowLanguageMenu(!showLanguageMenu); setShowThemeMenu(false); }}
                    variant="ghost"
                    className={`w-full justify-start gap-3 ${textSecondary} hover:text-white ${hoverBg}`}
                  >
                    <Languages className="w-5 h-5" />
                    <span className="flex-1 text-left">{t('languages')}</span>
                    <span className="text-lg">{languageOptions.find(l => l.code === language)?.flag}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {showLanguageMenu && (
                    <div className={`absolute left-0 right-0 mt-1 ${bgCardSolid} border ${borderColor} rounded-xl overflow-hidden z-50 shadow-xl`}>
                      {languageOptions.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors ${
                            language === lang.code ? 'bg-teal-500/20 text-teal-400' : textPrimary
                          }`}
                        >
                          <span className="text-xl">{lang.flag}</span>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{lang.name}</p>
                            <p className={`text-xs ${textSecondary}`} dir={lang.code === 'ku' || lang.code === 'ar' ? 'rtl' : 'ltr'}>
                              {lang.nativeName}
                            </p>
                          </div>
                          {language === lang.code && <Check className="w-4 h-4 text-teal-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme Selector */}
                <div className="relative">
                  <Button
                    onClick={() => { setShowThemeMenu(!showThemeMenu); setShowLanguageMenu(false); }}
                    variant="ghost"
                    className={`w-full justify-start gap-3 ${textSecondary} hover:text-white ${hoverBg}`}
                  >
                    <Palette className="w-5 h-5" />
                    <span className="flex-1 text-left">{t('themes')}</span>
                    {theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
                    {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
                    {theme === 'system' && <Monitor className="w-4 h-4 text-slate-400" />}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {showThemeMenu && (
                    <div className={`absolute left-0 right-0 mt-1 ${bgCardSolid} border ${borderColor} rounded-xl overflow-hidden z-50 shadow-xl`}>
                      {themeOptions.map((t) => {
                        const IconComponent = t.icon
                        return (
                          <button
                            key={t.code}
                            onClick={() => { setTheme(t.code); setShowThemeMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors ${
                              theme === t.code ? 'bg-teal-500/20 text-teal-400' : textPrimary
                            }`}
                          >
                            <IconComponent className={`w-5 h-5 ${
                              t.code === 'light' ? 'text-amber-400' : 
                              t.code === 'dark' ? 'text-blue-400' : 
                              'text-slate-400'
                            }`} />
                            <div className="flex-1 text-left">
                              <p className="font-medium">{t.name}</p>
                            </div>
                            {theme === t.code && <Check className="w-4 h-4 text-teal-400" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </nav>
            </Card>

            {/* MediMate AI Card */}
            <Card className={`${bgCard} ${borderColor} rounded-2xl overflow-hidden`}>
              <div className={`p-4 border-b ${borderColor} bg-gradient-to-r ${roleLogo.bg} opacity-90`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center`}>
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">MediMate AI</h3>
                    <p className="text-xs text-white/70">50+ Languages • GLM-5</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-white ml-auto animate-pulse" />
                </div>
              </div>
              <div className="p-4">
                <MediMateAI />
              </div>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* File Manager */}
            {activeTab === 'files' && (
              <>
                <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 bg-gradient-to-br ${roleLogo.bg} rounded-xl flex items-center justify-center`}>
                      <Database className={`w-5 h-5 ${roleLogo.iconColor || 'text-white'}`} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${textPrimary}`}>{t('fileManager')}</h2>
                      <p className={`text-xs ${textSecondary}`}>{t('addFilesDrive')}</p>
                    </div>
                  </div>
                  <FileManager
                    userId={user.id}
                    userRole={user.role}
                    currentFolderId={currentFolderId}
                    setCurrentFolderId={setCurrentFolderId}
                    onViewFile={(file) => setViewingFile(file)}
                  />
                </Card>

                {(user.role === 'admin' || user.role === 'manager' || (managerPermissions?.canUploadFiles)) && (
                  <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center`}>
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className={`text-xl font-bold ${textPrimary}`}>{t('uploadCenter')}</h2>
                        <p className={`text-xs ${textSecondary}`}>{t('addFilesDrive')}</p>
                      </div>
                    </div>
                    <DriveLinkUpload
                      userId={user.id}
                      userRole={user.role}
                      currentFolderId={currentFolderId}
                      onUploadComplete={() => {
                        console.log('Upload complete')
                      }}
                    />
                  </Card>
                )}
              </>
            )}

            {/* User Management */}
            {activeTab === 'users' && (user.role === 'admin' || user.role === 'manager') && (
              <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${textPrimary}`}>{t('userManagement')}</h2>
                    <p className={`text-xs ${textSecondary}`}>{t('approve')}, {t('restrict')}, and manage users</p>
                    {isSuperAdmin && (
                      <Badge className="mt-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Crown className="w-3 h-3 mr-1" /> Super Admin
                      </Badge>
                    )}
                  </div>
                </div>
                <UserManagementPanel
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  isSuperAdmin={isSuperAdmin}
                />
              </Card>
            )}

            {/* Permissions */}
            {activeTab === 'permissions' && (user.role === 'admin' || user.role === 'manager') && (
              <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${textPrimary}`}>{t('permissions')}</h2>
                    <p className={`text-xs ${textSecondary}`}>Manage folder permissions</p>
                  </div>
                </div>
                <PermissionManager
                  userId={user.id}
                  userRole={user.role}
                  currentFolderId={currentFolderId}
                />
              </Card>
            )}

            {/* File Permissions - Admin/Super Admin Only */}
            {activeTab === 'filePermissions' && (user.role === 'admin' || isSuperAdmin) && (
              <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <FileLock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-xl font-bold ${textPrimary}`}>File Permissions</h2>
                      {isSuperAdmin && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Crown className="w-3 h-3 mr-1" /> Super Admin
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs ${textSecondary}`}>Manage view and download permissions per student per file</p>
                  </div>
                </div>
                <FilePermissionsPanel
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  isSuperAdmin={isSuperAdmin}
                />
              </Card>
            )}

            {/* Device Management - Admin/Super Admin Only */}
            {activeTab === 'devices' && (user.role === 'admin' || isSuperAdmin) && (
              <Card className={`${bgCard} ${borderColor} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-xl font-bold ${textPrimary}`}>Device Management</h2>
                      {isSuperAdmin && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Crown className="w-3 h-3 mr-1" /> Super Admin
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs ${textSecondary}`}>Approve, revoke, or remove user devices</p>
                  </div>
                </div>
                <DeviceManagementPanel
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  isSuperAdmin={isSuperAdmin}
                />
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`${bgHeader} backdrop-blur-xl border-t ${borderColor} py-4`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className={`text-sm ${textSecondary}`}>
            {t('copyright')}
          </p>
          <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
            <Shield className="w-4 h-4" />
            <span>{t('hipaaCompliant')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
