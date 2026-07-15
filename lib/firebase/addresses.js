// src/lib/firebase/addresses.js
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore'
import { db } from './config'

// Each address has a generated id so it can be removed/edited individually
function generateAddressId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function getAddresses(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return []
  return snap.data().addresses || []
}

export async function addAddress(userId, address) {
  const newAddress = { ...address, id: generateAddressId() }
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    await setDoc(userRef, { addresses: [newAddress] }, { merge: true })
  } else {
    await updateDoc(userRef, { addresses: arrayUnion(newAddress) })
  }
  return newAddress
}

export async function removeAddress(userId, address) {
  await updateDoc(doc(db, 'users', userId), {
    addresses: arrayRemove(address),
  })
}

export async function updateAddresses(userId, addresses) {
  // Used when editing — replace the whole array since Firestore arrayUnion
  // can't update an item in place
  await updateDoc(doc(db, 'users', userId), { addresses })
}