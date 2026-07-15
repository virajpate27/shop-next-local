// src/lib/firebase/orders.js
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

export async function createOrder(orderData) {
  // ✅ Only create the order document — don't touch products from client
  // Stock decrement happens via API route (server has admin privileges)
  const ref = await addDoc(collection(db, 'orders'), {
    ...orderData,
    status: orderData.paymentMethod === 'cod' ? 'confirmed' : 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return ref.id
}

export async function getOrderById(orderId) {
  const snap = await getDoc(doc(db, 'orders', orderId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateOrderPayment(orderId, paymentData) {
  await updateDoc(doc(db, 'orders', orderId), {
    ...paymentData,
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrderStatus(orderId, status) {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: serverTimestamp(),
  })
}