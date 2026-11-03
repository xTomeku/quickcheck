import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Mancano VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY: copia .env.example in .env.local e compilali.',
  )
}

export const supabase = createClient<Database>(url, key)
