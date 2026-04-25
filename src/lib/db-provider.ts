import * as googleDb from './google-sheets';
import * as localDb from './local-db';

const isLocal = process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true';

export const db = isLocal ? localDb : googleDb;
