import * as localDb from './local-db';
import * as supabaseDb from './supabase-db';

// В продакшене всегда используем Supabase.
// В разработке используем Supabase, если задан USE_SUPABASE=true в .env.local, 
// иначе используем локальную JSON БД.
const isLocal = process.env.NODE_ENV === 'development' && process.env.USE_SUPABASE !== 'true';

export const db = isLocal ? localDb : supabaseDb;
