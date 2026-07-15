// src/lib/firebase/wishlist.js
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore'
import { db } from './config'

export async function getWishlist(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return []
  return snap.data().wishlist || []
}

export async function addToWishlist(userId, productId) {
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await setDoc(userRef, { wishlist: [productId] }, { merge: true })
  } else {
    await updateDoc(userRef, { wishlist: arrayUnion(productId) })
  }
}

export async function removeFromWishlist(userId, productId) {
  await updateDoc(doc(db, 'users', userId), {
    wishlist: arrayRemove(productId),
  })
}

export async function isInWishlist(userId, productId) {
  const wishlist = await getWishlist(userId)
  return wishlist.includes(productId)
}