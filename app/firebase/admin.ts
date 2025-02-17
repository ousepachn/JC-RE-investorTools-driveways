import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { serviceAccount } from './admin-config';

const app = initializeApp({
  credential: cert(serviceAccount as ServiceAccount)
});

export const adminDb = getFirestore(app); 