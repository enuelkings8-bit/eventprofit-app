import { createClient } from '@supabase/supabase-js'
// Seule la clé "anon public" est utilisée ici. Jamais la clé "service_role".
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
