// src/lib/firebase/returns.js
import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, query, where, orderBy,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore'
import { db } from './config'

export const RETURN_REASONS = [
  'Item damaged or defective',
  'Wrong item received',
  'Item not as described',
  'Size/fit issue',
  'Changed my mind',
  'Missing parts or accessories',
  'Other',
]

export const RETURN_STATUSES = {
  pending:  { label: 'Pending review',  color: 'amber' },
  approved: { label: 'Approved',         color: 'green' },
  rejected: { label: 'Rejected',         color: 'red'   },
  refunded: { label: 'Refunded',         color: 'blue'  },
}

// ── Create ──────────────────────────────────────────────────────────────────
export async function createReturnRequest(data) {
  const ref = await addDoc(collection(db, 'returns'), {
    ...data,
    status:    'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// ── Read ─────────────────────────────────────────────────────────────────────
export async function getReturnByOrderId(orderId) {
  const q    = query(collection(db, 'returns'), where('orderId', '==', orderId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export async function getReturnById(returnId) {
  const snap = await getDoc(doc(db, 'returns', returnId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function getAllReturns() {
  const snap = await getDocs(
    query(collection(db, 'returns'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeToAllReturns(callback) {
  const q = query(collection(db, 'returns'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// ── Update ───────────────────────────────────────────────────────────────────
export async function updateReturnStatus(returnId, status, adminNote = '') {
  await updateDoc(doc(db, 'returns', returnId), {
    status,
    adminNote,
    resolvedAt: status === 'approved' || status === 'rejected'
      ? new Date().toISOString()
      : null,
    updatedAt: serverTimestamp(),
  })
}

// ── Eligibility check ─────────────────────────────────────────────────────────
export function isReturnEligible(order, RETURN_WINDOW_DAYS = 7) {
  if (!order) return { eligible: false, reason: 'Order not found' }

  if (order.status !== 'delivered') {
    return { eligible: false, reason: 'Only delivered orders can be returned' }
  }

  // Find when order was delivered
  const deliveredEvent = order.timeline?.find((e) => e.status === 'delivered')
  if (!deliveredEvent) {
    return { eligible: false, reason: 'Delivery not confirmed yet' }
  }

  const deliveredAt  = new Date(deliveredEvent.timestamp)
  const now          = new Date()
  const daysDiff     = Math.floor((now - deliveredAt) / (1000 * 60 * 60 * 24))

  if (daysDiff > RETURN_WINDOW_DAYS) {
    return {
      eligible: false,
      reason:   `Return window of ${RETURN_WINDOW_DAYS} days has expired`,
    }
  }

  return {
    eligible:       true,
    daysRemaining:  RETURN_WINDOW_DAYS - daysDiff,
  }
}