import admin from 'firebase-admin';

/**
 * Firebase Admin SDK Configuration
 * Used for verifying Firebase ID tokens from client
 * Service account key should be in .env as FIREBASE_SERVICE_ACCOUNT
 */
export const initializeFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      return;
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
};

export const getAuth = () => admin.auth();

export const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid Firebase token');
  }
};

export default admin;
