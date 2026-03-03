import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

// Client for frontend (uses anon key)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any // Fallback for build time

// Admin client for backend operations (uses service role key)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any // Fallback for build time

// Database Types
export interface User {
  id: string
  name: string | null
  email: string
  password: string
  role: 'admin' | 'manager' | 'doctor' | 'student'
  status: 'active' | 'pending' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface File {
  id: string
  name: string
  type: 'file' | 'drive_link'
  url: string
  folder_id: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface FolderPermission {
  id: string
  folder_id: string
  user_id: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
  created_at: string
  updated_at: string
}

export interface ManagerPermission {
  id: string
  manager_id: string
  can_upload_files: boolean
  can_manage_permissions: boolean
  can_create_folders: boolean
  created_at: string
  updated_at: string
}

export interface PDFAnnotation {
  id: string
  file_id: string
  user_id: string
  page_number: number
  annotation_data: string // JSON string of tldraw snapshot
  created_at: string
  updated_at: string
}
