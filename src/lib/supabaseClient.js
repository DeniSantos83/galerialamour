import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://slujqloykfxrgykpooif.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdWpxbG95a2Z4cmd5a3Bvb2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2NzIsImV4cCI6MjA4ODgxMDY3Mn0.XjqZcQjYQSM94aCtXbPolTdGGItH0EyRtZyPDT1mCTo"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)