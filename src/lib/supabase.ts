import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mmugalgqdapidqqxekqt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdWdhbGdxZGFwaWRxcXhla3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQzMTMsImV4cCI6MjA4NjQ4MDMxM30.b96o0Z-24rs2pczsPSDG8jP1UwbCuCCxxQEiZ_6wil8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
