import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmugalgqdapidqqxekqt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdWdhbGdxZGFwaWRxcXhla3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQzMTMsImV4cCI6MjA4NjQ4MDMxM30.b96o0Z-24rs2pczsPSDG8jP1UwbCuCCxxQEiZ_6wil8'
const supabaseAuthStorageKey = import.meta.env.VITE_SUPABASE_AUTH_STORAGE_KEY || 'sb-mmugalgqdapidqqxekqt-auth-token'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: supabaseAuthStorageKey,
  },
})
