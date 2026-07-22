// src/lib/firebase/orders.js
import {
  collection, doc, addDoc, getDoc,
  updateDoc, serverTimestamp, arrayUnion,
} from 'firebase/firestore'
import { db } from './config'

export async function createOrder(orderData) {
  // Initial timeline event
  const initialEvent = {
    status:    orderData.paymentMethod === 'cod' ? 'confirmed' : 'pending',
    timestamp: new Date().toISOString(),
    note:      orderData.paymentMethod === 'cod'
      ? 'Order placed with Cash on Delivery'
      : 'Order placed successfully',
  }

  const ref = await addDoc(collection(db, 'orders'), {
    ...orderData,
    status:   initialEvent.status,
    timeline: [initialEvent],
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
  const event = {
    status:    'confirmed',
    timestamp: new Date().toISOString(),
    note:      'Payment confirmed via Razorpay',
  }

  await updateDoc(doc(db, 'orders', orderId), {
    ...paymentData,
    status:    'confirmed',
    timeline:  arrayUnion(event),
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrderStatus(orderId, status, note = '') {
  const STATUS_NOTES = {
    processing: 'Your items are being packed and prepared for dispatch.',
    shipped:    'Your order has been shipped and is on its way.',
    delivered:  'Your order has been delivered successfully.',
    cancelled:  'Your order has been cancelled.',
  }

  const event = {
    status,
    timestamp: new Date().toISOString(),
    note:      note || STATUS_NOTES[status] || `Order status updated to ${status}`,
  }

  await updateDoc(doc(db, 'orders', orderId), {
    status,
    timeline:  arrayUnion(event),
    updatedAt: serverTimestamp(),
  })
}