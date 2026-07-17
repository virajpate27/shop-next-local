// src/lib/firebase/admin.js — update to export FieldValue too
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const adminApp = getAdminApp()
export const adminDb = getFirestore(adminApp)
export { FieldValue }