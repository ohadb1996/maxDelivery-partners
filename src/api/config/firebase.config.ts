import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import devConfig from './dev/firebaseConfig.json';
import prodConfig from './prod/firebaseConfig.json';
import { isDev } from '../utils/config';

//console.log('[Firebase] Initializing Firebase config, isDev:', isDev);

const firebaseConfig = isDev ? devConfig : prodConfig;

//console.log('[Firebase] Using config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//console.log('[Firebase] Firebase app initialized');

// Initialize services
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// הפעלת persistence רק עבור אימות - רק בסביבת browser
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence);
  //console.log('[Firebase] Auth persistence set to LOCAL');
}

//console.log('[Firebase] Services initialized:', { db: !!db, storage: !!storage, auth: !!auth });

export { app, db, auth, storage};
