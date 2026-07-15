// src/lib/firebase/auth.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { triggerEmail } from '@/lib/triggerEmail'

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail(email, password, name) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });

  await setDoc(doc(db, 'users', result.user.uid), {
    uid: result.user.uid,
    email,
    displayName: name,
    photoURL: null,
    role: 'customer',
    addresses: [],
    wishlist: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Send welcome email (fire and forget — don't block registration)
  triggerEmail('welcome', email, { displayName: name })

  return result.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  const userRef = doc(db, 'users', result.user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      role: 'customer',
      addresses: [],
      wishlist: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

     // First-time Google sign-in — send welcome email
     triggerEmail('welcome', result.user.email, {
      displayName: result.user.displayName,
    })
  }

  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
