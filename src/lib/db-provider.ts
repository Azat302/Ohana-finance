import * as localDb from './local-db';
import * as supabaseDb from './supabase-db';

const isLocal = process.env.NODE_ENV === 'development' && process.env.USE_LOCAL_DB === 'true';

// Всегда используем Supabase в продакшене, или локальную БД если явно указано в dev
export const db = isLocal ? localDb : supabaseDb;
