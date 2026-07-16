// src/lib/firebase/coupons.js
import {
  collection, doc, addDoc, getDocs,
  getDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from './config'

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function getCoupons() {
  const snap = await getDocs(collection(db, 'coupons'))
  const coupons = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return coupons.sort((a, b) => {
    const toMs = (v) => (v?.toDate ? v.toDate().getTime() : 0)
    return toMs(b.createdAt) - toMs(a.createdAt)
  })
}

export async function getCouponById(id) {
  const snap = await getDoc(doc(db, 'coupons', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function createCoupon(data) {
  // Force code to uppercase + no spaces
  const code = String(data.code).toUpperCase().trim().replace(/\s+/g, '')
  if (!code) throw new Error('Coupon code is required')

  // Check for duplicate code
  const existing = await getCouponByCode(code)
  if (existing) throw new Error(`Coupon code "${code}" already exists`)

  const ref = await addDoc(collection(db, 'coupons'), {
    ...data,
    code,
    usedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCoupon(id, data) {
  const code = data.code
    ? String(data.code).toUpperCase().trim().replace(/\s+/g, '')
    : undefined
  await updateDoc(doc(db, 'coupons', id), {
    ...data,
    ...(code && { code }),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCoupon(id) {
  await deleteDoc(doc(db, 'coupons', id))
}

export async function toggleCoupon(id, isActive) {
  await updateDoc(doc(db, 'coupons', id), { isActive, updatedAt: serverTimestamp() })
}

// ── Validation ────────────────────────────────────────────────────────────

export async function getCouponByCode(code) {
  const normalised = String(code).toUpperCase().trim()
  const q = query(collection(db, 'coupons'), where('code', '==', normalised))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

/**
 * Validate a coupon code against cart totals.
 * Returns { valid, coupon, discount, error }
 */
export async function validateCoupon(code, cartTotal) {
  const coupon = await getCouponByCode(code)

  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code' }
  }
  if (!coupon.isActive) {
    return { valid: false, error: 'This coupon is no longer active' }
  }

  // Expiry check
  if (coupon.expiresAt) {
    const expiry = coupon.expiresAt?.toDate
      ? coupon.expiresAt.toDate()
      : new Date(coupon.expiresAt)
    if (new Date() > expiry) {
      return { valid: false, error: 'This coupon has expired' }
    }
  }

  // Usage limit check
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'This coupon has reached its usage limit' }
  }

  // Minimum order check
  if (coupon.minOrder > 0 && cartTotal < coupon.minOrder) {
    return {
      valid: false,
      error: `Minimum order of ₹${coupon.minOrder} required for this coupon`,
    }
  }

  // Calculate discount amount
  const discount = calculateDiscount(coupon, cartTotal)

  return { valid: true, coupon, discount }
}

/**
 * Calculate how much discount a coupon gives.
 * Returns the rupee amount to subtract.
 */
export function calculateDiscount(coupon, cartTotal) {
  if (!coupon) return 0

  switch (coupon.discountType) {
    case 'flat':
      // Never discount more than the cart total
      return Math.min(Number(coupon.discountValue) || 0, cartTotal)

    case 'percent': {
      const pct = Math.min(Number(coupon.discountValue) || 0, 100)
      const raw = (cartTotal * pct) / 100
      // Apply max discount cap if set
      const maxDiscount = coupon.maxDiscount || Infinity
      return Math.min(raw, maxDiscount)
    }

    case 'free_shipping':
      // Handled separately in shipping calc — return 0 here
      return 0

    default:
      return 0
  }
}

// ── Usage tracking ─────────────────────────────────────────────────────────

export async function incrementCouponUsage(couponId) {
  await updateDoc(doc(db, 'coupons', couponId), {
    usedCount: increment(1),
    updatedAt: serverTimestamp(),
  })
}