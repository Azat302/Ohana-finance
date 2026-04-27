import * as googleDb from './google-sheets';
import * as localDb from './local-db';
import * as supabaseDb from './supabase-db';

const isLocal = process.env.NODE_ENV === 'development' && process.env.USE_LOCAL_DB === 'true';
const useSupabase = process.env.USE_SUPABASE === 'true';

export const db = useSupabase ? supabaseDb : (isLocal ? localDb : googleDb);
