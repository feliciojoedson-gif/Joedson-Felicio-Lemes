// Único lugar que cria o cliente do Supabase. Só `dados.js` importa este arquivo.
// A chave é a "publishable" (feita para o navegador); a proteção dos dados é a RLS do banco.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !chave) throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (veja .env.example).')

export const supabase = createClient(url, chave)
