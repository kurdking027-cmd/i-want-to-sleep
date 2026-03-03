'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'

// Translation type
type Translations = {
  [key: string]: {
    en: string
    ku: string // Kurdish Sorani
    ar: string // Iraqi Arabic
    tk: string // Iraqi Turkmeni
  }
}

// All translations
export const translations: Translations = {
  // Navigation & Menu
  appName: {
    en: 'MEDICORE ACADEMY',
    ku: 'ئەکادیمیای مێدیكۆر',
    ar: 'أكاديمية ميديكور',
    tk: 'مێدیكۆر ئاكادێمیاسی'
  },
  eliteMedicalEducation: {
    en: 'Elite Medical Education Platform',
    ku: 'پلاتفۆرمی پەروەردەی پزیشکی نایاب',
    ar: 'منصة التعليم الطبي المتميز',
    tk: 'ئێلایت مێدیكال ئێدیوکێیشن پلاتفۆرمی'
  },
  fileManager: {
    en: 'File Manager',
    ku: 'بەڕێوەبەری فایل',
    ar: 'مدير الملفات',
    tk: 'فایل مێنێجەری'
  },
  userManagement: {
    en: 'User Management',
    ku: 'بەڕێوەبەری بەکارهێنەران',
    ar: 'إدارة المستخدمين',
    tk: 'ئیستیفاده‌چی ایدارەسی'
  },
  permissions: {
    en: 'Permissions',
    ku: 'مۆڵەتەکان',
    ar: 'الصلاحيات',
    tk: 'ئیجازەلەر'
  },
  languages: {
    en: 'Languages',
    ku: 'زمانەکان',
    ar: 'اللغات',
    tk: 'دیله‌ر'
  },
  themes: {
    en: 'Themes',
    ku: 'ڕووکارەکان',
    ar: 'السمات',
    tk: 'تێمالار'
  },
  signOut: {
    en: 'Sign Out',
    ku: 'چوونەدەرەوە',
    ar: 'تسجيل الخروج',
    tk: 'چیخیش'
  },
  
  // Auth
  login: {
    en: 'Login',
    ku: 'چوونەناو',
    ar: 'تسجيل الدخول',
    tk: 'گیریش'
  },
  signup: {
    en: 'Create Account',
    ku: 'دروستکردنی هەژمار',
    ar: 'إنشاء حساب',
    tk: 'حیساب یاراتماق'
  },
  email: {
    en: 'Email',
    ku: 'ئیمێیل',
    ar: 'البريد الإلكتروني',
    tk: 'ئیمێیل'
  },
  password: {
    en: 'Password',
    ku: 'تێپەڕەوشە',
    ar: 'كلمة المرور',
    tk: 'شیفری'
  },
  fullName: {
    en: 'Full Name',
    ku: 'ناوی تەواو',
    ar: 'الاسم الكامل',
    tk: 'تام آد'
  },
  secureLogin: {
    en: 'Secure Login',
    ku: 'چوونەناوی پارێزراو',
    ar: 'تسجيل دخول آمن',
    tk: 'گۆڤەنلی گیریش'
  },
  createNewAccount: {
    en: 'Create New Account',
    ku: 'دروستکردنی هەژماری نوێ',
    ar: 'إنشاء حساب جديد',
    tk: 'یێنی حیساب یاراتماق'
  },
  returnToLogin: {
    en: 'Return to Login',
    ku: 'گەڕانەوە بۆ چوونەناو',
    ar: 'العودة لتسجيل الدخول',
    tk: 'گیریشه قایت'
  },
  
  // User Management
  totalUsers: {
    en: 'Total Users',
    ku: 'کۆی بەکارهێنەران',
    ar: 'إجمالي المستخدمين',
    tk: 'تام ایشله‌تنلر'
  },
  active: {
    en: 'Active',
    ku: 'چالاک',
    ar: 'نشط',
    tk: 'ئاکتیو'
  },
  pending: {
    en: 'Pending',
    ku: 'چاوەڕوان',
    ar: 'قيد الانتظار',
    tk: 'گؤزلین'
  },
  approve: {
    en: 'Approve',
    ku: 'پەسەندکردن',
    ar: 'موافقة',
    tk: 'قەبول'
  },
  restrict: {
    en: 'Restrict',
    ku: 'قەدەغەکردن',
    ar: 'حظر',
    tk: 'قاداغا'
  },
  reactivate: {
    en: 'Reactivate',
    ku: 'چالاککردنەوە',
    ar: 'إعادة تفعيل',
    tk: 'یئنیدن آکتیو'
  },
  changeRole: {
    en: 'Change Role',
    ku: 'گۆڕینی ڕۆڵ',
    ar: 'تغيير الدور',
    tk: 'ڕۆل دَییشدیرمه'
  },
  searchUsers: {
    en: 'Search users by name or email...',
    ku: 'گەڕان بەکارهێنەران بە ناو یان ئیمێیل...',
    ar: 'البحث عن المستخدمين بالاسم أو البريد...',
    tk: 'آد یا ئیمێیلله‌ گؤزله‌...'
  },
  allRoles: {
    en: 'All Roles',
    ku: 'هەموو ڕۆڵەکان',
    ar: 'جميع الأدوار',
    tk: 'هاماسی ڕۆللر'
  },
  allStatus: {
    en: 'All Status',
    ku: 'هەموو دۆخەکان',
    ar: 'جميع الحالات',
    tk: 'هاماسی دؤوروملار'
  },
  
  // Roles
  admin: {
    en: 'Admin',
    ku: 'بەڕێوەبەر',
    ar: 'مدير',
    tk: 'ئیدارەچی'
  },
  manager: {
    en: 'Manager',
    ku: 'بەڕێوەبەری میدیای',
    ar: 'مشرف',
    tk: 'مێنێجەر'
  },
  doctor: {
    en: 'Doctor',
    ku: 'پزیشک',
    ar: 'طبيب',
    tk: 'دوکتور'
  },
  student: {
    en: 'Student',
    ku: 'خوێندکار',
    ar: 'طالب',
    tk: 'شاگیرد'
  },
  
  // Status
  inactive: {
    en: 'Inactive',
    ku: 'ناچالاک',
    ar: 'غير نشط',
    tk: 'ئینئکتیو'
  },
  
  // File Manager
  newFolder: {
    en: 'New Folder',
    ku: 'فۆڵدەری نوێ',
    ar: 'مجلد جديد',
    tk: 'یێنی فایل'
  },
  root: {
    en: 'Root',
    ku: 'سەرەکی',
    ar: 'الجذور',
    tk: 'کؤک'
  },
  back: {
    en: 'Back',
    ku: 'گەڕانەوە',
    ar: 'رجوع',
    tk: 'قایت'
  },
  emptyDirectory: {
    en: 'Empty Directory',
    ku: 'بوخچەی بەتاڵ',
    ar: 'مجلد فارغ',
    tk: 'بوش فایل'
  },
  noFilesFolders: {
    en: 'No files or folders in this location',
    ku: 'هیچ فایل یان فۆڵدەرێک نییە لەم شوێنە',
    ar: 'لا توجد ملفات أو مجلدات في هذا الموقع',
    tk: 'بور یئرده فایل یوخدور'
  },
  
  // Upload
  uploadCenter: {
    en: 'Upload Center',
    ku: 'ناوەندی بارکردن',
    ar: 'مركز التحميل',
    tk: 'یوکلەمه مرکزی'
  },
  addFilesDrive: {
    en: 'Add files or Drive links',
    ku: 'زیادکردنی فایل یان بەستەری درایڤ',
    ar: 'إضافة ملفات أو روابط درايف',
    tk: 'فایل یا درایو باغلانتی آرتیر'
  },
  resourceName: {
    en: 'Resource Name',
    ku: 'ناوی سەرچاوە',
    ar: 'اسم المصدر',
    tk: 'قایناق آدی'
  },
  googleDriveUrl: {
    en: 'Google Drive URL',
    ku: 'بەستەری گووگڵ درایڤ',
    ar: 'رابط جوجل درايف',
    tk: 'گوگۆل درایو باغلانتیسی'
  },
  addDriveLink: {
    en: 'Add Drive Link',
    ku: 'زیادکردنی بەستەری درایڤ',
    ar: 'إضافة رابط درايف',
    tk: 'درایو باغلانتی آرتیر'
  },
  fileCategory: {
    en: 'File Category',
    ku: 'هاوپۆشی فایل',
    ar: 'فئة الملف',
    tk: 'فایل کاتگوریاسی'
  },
  driveLink: {
    en: 'Drive Link',
    ku: 'بەستەری درایڤ',
    ar: 'رابط درايف',
    tk: 'درایو باغلانتیسی'
  },
  pdfDocument: {
    en: 'PDF Document',
    ku: 'بەڵگەنامەی PDF',
    ar: 'مستند PDF',
    tk: 'PDF بلگه‌سی'
  },
  image: {
    en: 'Image',
    ku: 'وێنە',
    ar: 'صورة',
    tk: 'رەسیم'
  },
  video: {
    en: 'Video',
    ku: 'ڤیدیۆ',
    ar: 'فيديو',
    tk: 'ویدیو'
  },
  audio: {
    en: 'Audio',
    ku: 'دەنگ',
    ar: 'صوت',
    tk: 'سس'
  },
  spreadsheet: {
    en: 'Spreadsheet',
    ku: 'خشتە',
    ar: 'جدول',
    tk: 'تابلۆ'
  },
  presentation: {
    en: 'Presentation',
    ku: 'پرێزێنتەیشن',
    ar: 'عرض تقديمي',
    tk: 'پرێزێنتاسییا'
  },
  document: {
    en: 'Document',
    ku: 'بەڵگەنامە',
    ar: 'مستند',
    tk: 'بلگه'
  },
  
  // Theme
  light: {
    en: 'Light',
    ku: 'ڕووناک',
    ar: 'فاتح',
    tk: 'آچیق'
  },
  dark: {
    en: 'Dark',
    ku: 'تاریک',
    ar: 'داكن',
    tk: 'قارانلیق'
  },
  system: {
    en: 'System',
    ku: 'سیستەم',
    ar: 'النظام',
    tk: 'سیستئم'
  },
  
  // Device Security
  connectedDevices: {
    en: 'Connected Devices',
    ku: 'ئامێرەکانەوە بەستراوەتەوە',
    ar: 'الأجهزة المتصلة',
    tk: 'باغلی ئوتقوللار'
  },
  deviceName: {
    en: 'Device Name',
    ku: 'ناوی ئامێر',
    ar: 'اسم الجهاز',
    tk: 'ئوتقول آدی'
  },
  lastActive: {
    en: 'Last Active',
    ku: 'دواین چالاکی',
    ar: 'آخر نشاط',
    tk: 'سون آکتیولیک'
  },
  deviceApproved: {
    en: 'Device Approved',
    ku: 'ئامێر پەسەند کرا',
    ar: 'تمت الموافقة على الجهاز',
    tk: 'ئوتقول قەبول ائدیلدی'
  },
  devicePending: {
    en: 'Device Pending',
    ku: 'ئامێر چاوەڕوانی پەسەندکردنە',
    ar: 'الجهاز في انتظار الموافقة',
    tk: 'ئوتقول گؤزلین'
  },
  newDeviceLogin: {
    en: 'New Device Login Detected',
    ku: 'چوونەناو لە ئامێرێکی نوێ دەستنیشان کرا',
    ar: 'تم اكتشاف تسجيل دخول من جهاز جديد',
    tk: 'یێنی ئوتقولدان گیریش تاپیلدی'
  },
  approveDevice: {
    en: 'Approve Device',
    ku: 'پەسەندکردنی ئامێر',
    ar: 'الموافقة على الجهاز',
    tk: 'ئوتقولو قەبول ائت'
  },
  rejectDevice: {
    en: 'Reject Device',
    ku: 'ڕەتکردنی ئامێر',
    ar: 'رفض الجهاز',
    tk: 'ئوتقولو رەد ائت'
  },
  
  // Notifications
  notifications: {
    en: 'Notifications',
    ku: 'ئاگادارییەکان',
    ar: 'الإشعارات',
    tk: 'بیلدیریشلر'
  },
  markAllRead: {
    en: 'Mark All Read',
    ku: 'هەموو بخوێنەرەوە',
    ar: 'تحديد الكل كمقروء',
    tk: 'هاماسینی اوخودو'
  },
  
  // Awaiting Approval
  awaitingApproval: {
    en: 'Awaiting Approval',
    ku: 'چاوەڕوانی پەسەندکردن',
    ar: 'في انتظار الموافقة',
    tk: 'قەبول گؤزلین'
  },
  accountPending: {
    en: 'Your account is pending verification by faculty administration.',
    ku: 'هەژمارەکەت چاوەڕوانی پشتڕاستکردنەوەیە لەلایەن ئیدارەی فاکەڵتییەوە.',
    ar: 'حسابك في انتظار التحقق من إدارة الكلية.',
    tk: 'حیسابینیز فاکولته ایدارسیندان دؤغرولاما گؤزلین.'
  },
  verificationProcess: {
    en: 'Verification Process',
    ku: 'پڕۆسەی پشتڕاستکردنەوە',
    ar: 'عملية التحقق',
    tk: 'دۆغرولاما پرؤسه‌سی'
  },
  verificationStep1: {
    en: 'Verification of institutional email address',
    ku: 'پشتڕاستکردنەوەی ناونیشانی ئیمێیلی دامەزراوەیی',
    ar: 'التحقق من عنوان البريد الإلكتروني المؤسسي',
    tk: 'مۆئسیسه ئیمێیل آدرئسینی دۆغرولاما'
  },
  verificationStep2: {
    en: 'Academic credential validation',
    ku: 'پشتڕاستکردنەوەی بەڵگەی ئەکادیمی',
    ar: 'التحقق من صلاحية الاعتماد الأكاديمي',
    tk: 'ئاکادئمیک بلگه‌لری دۆغرولاما'
  },
  verificationStep3: {
    en: 'Account activation & notification',
    ku: 'چالاککردنی هەژمار و ئاگاداری',
    ar: 'تفعيل الحساب والإشعار',
    tk: 'حیساب آکتیولئشماسی و بیلدیریش'
  },
  
  // Misc
  cancel: {
    en: 'Cancel',
    ku: 'هەڵوەشاندنەوە',
    ar: 'إلغاء',
    tk: 'لغو'
  },
  confirm: {
    en: 'Confirm',
    ku: 'پشتڕاستکردنەوە',
    ar: 'تأكيد',
    tk: 'تأیید'
  },
  save: {
    en: 'Save',
    ku: 'پاشەکەوتکردن',
    ar: 'حفظ',
    tk: 'ساخلama'
  },
  delete: {
    en: 'Delete',
    ku: 'سڕینەوە',
    ar: 'حذف',
    tk: 'سیلمه'
  },
  edit: {
    en: 'Edit',
    ku: 'دەستکاریکردن',
    ar: 'تحرير',
    tk: 'دَییشدیرمه'
  },
  loading: {
    en: 'Loading...',
    ku: 'بارکردن...',
    ar: 'جاري التحميل...',
    tk: 'یوکلئنیر...'
  },
  success: {
    en: 'Success',
    ku: 'سەرکەوتوو',
    ar: 'نجاح',
    tk: 'اوغورلو'
  },
  error: {
    en: 'Error',
    ku: 'هەڵە',
    ar: 'خطأ',
    tk: 'خطا'
  },
  resourceAddedSuccess: {
    en: 'Resource added successfully!',
    ku: 'سەرچاوە بە سەرکەوتوویی زیاد کرا!',
    ar: 'تمت إضافة المصدر بنجاح!',
    tk: 'قایناق اوغورلو آرتیریلدی!'
  },
  hipaaCompliant: {
    en: 'HIPAA Compliant • Secure',
    ku: 'گونجانی HIPAA • پارێزراو',
    ar: 'متوافق مع HIPAA • آمن',
    tk: 'HIPAA اویدور • گۆڤەنلی'
  },
  copyright: {
    en: '© 2026 MEDICORE ACADEMY • HAWLER | KURDISTAN',
    ku: '© ٢٠٢٦ ئەکادیمیای مێدیكۆر • هەولێر | کوردستان',
    ar: '© 2026 أكاديمية ميديكور • هولير | كوردستان',
    tk: '© 2026 مێدیكۆر ئاکادیمیا • هه‌ولێر | کوردستان'
  },
  
  // Welcome Messages
  welcome: {
    en: 'WELCOME',
    ku: 'بەخێربێیت',
    ar: 'أهلاً وسهلاً',
    tk: 'خۆش گەڵدین'
  },
  welcomeStudent: {
    en: 'Ready to explore medical resources?',
    ku: 'ئامادەیت بۆ گەڕان بە سەرچاوە پزیشکییەکان؟',
    ar: 'هل أنت مستعد لاستكشاف الموارد الطبية؟',
    tk: 'طیب سورغلارینی آراشدیرماغا حاضیرسینیز؟'
  },
  welcomeDoctor: {
    en: 'Access your medical resources and tools',
    ku: 'دەستت بگات بە سەرچاوە و ئامرازە پزیشکییەکانت',
    ar: 'الوصول إلى مواردك وأدواتك الطبية',
    tk: 'طیب سورغلارینیوز و آراجلارینیزیز ایشله‌دین'
  },
  
  // User Management Panel
  totalUsers: {
    en: 'Total Users',
    ku: 'کۆی بەکارهێنەران',
    ar: 'إجمالي المستخدمين',
    tk: 'تام ایشله‌تنلر'
  },
  searchUsers: {
    en: 'Search users by name or email...',
    ku: 'گەڕان بەکارهێنەران بە ناو یان ئیمێیل...',
    ar: 'البحث عن المستخدمين بالاسم أو البريد...',
    tk: 'آد یا ئیمێیلله‌ گؤزله‌...'
  },
  allRoles: {
    en: 'All Roles',
    ku: 'هەموو ڕۆڵەکان',
    ar: 'جميع الأدوار',
    tk: 'هاماسی ڕۆللر'
  },
  allStatus: {
    en: 'All Status',
    ku: 'هەموو دۆخەکان',
    ar: 'جميع الحالات',
    tk: 'هاماسی دؤوروملار'
  },
  devicePending: {
    en: 'Device Pending Approval',
    ku: 'ئامێرەکەت چاوەڕوانی پەسەندکردنە',
    ar: 'جهازك في انتظار الموافقة',
    tk: 'ئوتقولو گؤزلین'
  },
  devicePendingDesc: {
    en: 'This new device requires admin approval before you can access your account.',
    ku: 'ئەم ئامێرە نوێیە پێویستی بە پەسەندکردنی بەڕێوەبەر هەیە پێش ئەوەی بتوانیت بچیتە ناوەوە.',
    ar: 'هذا الجهاز الجديد يحتاج إلى موافقة المسؤول قبل أن تتمكن من تسجيل الدخول.',
    tk: 'بو یئنی ئوتقول ایدارەچی تصدیقی لازیمدیر.'
  },
  newDevice: {
    en: 'New Device Detected',
    ku: 'ئامێری نوێ',
    ar: 'جهاز جديد',
    tk: 'یئنی ئوتقول'
  },
  waitApproval: {
    en: 'Please wait for approval or contact your administrator.',
    ku: 'تکایە چاوەڕوانی پەسەندکردن بکە یان پەیوەندی بکە بە بەڕێوەبەرەوە.',
    ar: 'يرجى الانتظار للموافقة أو الاتصال بالمسؤول.',
    tk: 'تکایە تصدیق گؤزلین یا ایدارەچیله‌ علاقه‌ قورun.'
  },
  connectedDevices: {
    en: 'Connected Devices',
    ku: 'ئامێرەکانەوە بەستراوەتەوە',
    ar: 'الأجهزة المتصلة',
    tk: 'باغلی ئوتقوللار'
  },
  approveDevice: {
    en: 'Approve Device',
    ku: 'پەسەندکردنی ئامێر',
    ar: 'الموافقة على الجهاز',
    tk: 'ئوتقولو قەبول ائت'
  },
  restrictDevice: {
    en: 'Restrict Device',
    ku: 'قەدەغەکردنی ئامێر',
    ar: 'حظر الجهاز',
    tk: 'ئوتقولو قاداغا'
  },
  password: {
    en: 'Password',
    ku: 'تێپەڕەوشە',
    ar: 'كلمة المرور',
    tk: 'شیفری'
  }
}

type LanguageCode = 'en' | 'ku' | 'ar' | 'tk'

interface LanguageContextType {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  t: (key: string) => string
  isRTL: boolean
  mounted: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with 'en' on server to avoid hydration mismatch
  const [language, setLanguageState] = useState<LanguageCode>('en')
  const [mounted, setMounted] = useState(false)

  // Load saved language on client mount
  useEffect(() => {
    const saved = localStorage.getItem('medicore_language') as LanguageCode
    if (saved && ['en', 'ku', 'ar', 'tk'].includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading saved preference from localStorage on mount
      setLanguageState(saved)
      document.documentElement.dir = (saved === 'ku' || saved === 'ar') ? 'rtl' : 'ltr'
      document.documentElement.lang = saved
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('medicore_language', lang)
      document.documentElement.dir = (lang === 'ku' || lang === 'ar') ? 'rtl' : 'ltr'
      document.documentElement.lang = lang
    }
  }

  const t = useCallback((key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    // Always use English during SSR to avoid hydration mismatch
    if (!mounted) return translation.en || key
    return translation[language] || translation.en || key
  }, [language, mounted])

  const isRTL = mounted && (language === 'ku' || language === 'ar')

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    isRTL,
    mounted
  }), [language, t, isRTL, mounted])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Language options for UI
export const languageOptions = [
  { code: 'en' as LanguageCode, name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ku' as LanguageCode, name: 'Kurdish Sorani', nativeName: 'کوردی سۆرانی', flag: '☀️' },
  { code: 'ar' as LanguageCode, name: 'Iraqi Arabic', nativeName: 'العربية العراقية', flag: '🇮🇶' },
  { code: 'tk' as LanguageCode, name: 'Iraqi Turkmeni', nativeName: 'ترکمانی عراق', flag: '🌙' }
]
