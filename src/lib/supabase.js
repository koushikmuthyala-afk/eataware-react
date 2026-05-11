import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPA_URL
const key = import.meta.env.VITE_SUPA_KEY

if (!url || !key) throw new Error('Missing VITE_SUPA_URL or VITE_SUPA_KEY in .env.local')

export const supabase = createClient(url, key)
