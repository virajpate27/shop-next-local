// src/app/api/coupons/validate/route.js
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

async function getCouponByCode(code) {
  const normalised = String(code).toUpperCase().trim()
  const snap = await adminDb
    .collection('coupons')
    .where('code', '==', normalised)
    .limit(1)
    .get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

function calculateDiscount(coupon, cartTotal) {
  switch (coupon.discountType) {
    case 'flat':
      return Math.min(Number(coupon.discountValue) || 0, cartTotal)

    case 'percent': {
      const pct = Math.min(Number(coupon.discountValue) || 0, 100)
      const raw = (cartTotal * pct) / 100
      const maxDiscount = coupon.maxDiscount || Infinity
      return Math.round(Math.min(raw, maxDiscount) * 100) / 100
    }

    case 'free_shipping':
      return 0

    default:
      return 0
  }
}

export async function POST(req) {
  try {
    const { code, cartTotal } = await req.json()

    if (!code?.trim()) {
      return NextResponse.json(
        { valid: false, error: 'Please enter a coupon code' },
        { status: 400 }
      )
    }
    if (!cartTotal || cartTotal <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Cart is empty' },
        { status: 400 }
      )
    }

    const coupon = await getCouponByCode(code.trim())

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code' })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active' })
    }

    // Expiry check — Firestore Admin returns Timestamp objects
    if (coupon.expiresAt) {
      const expiry = coupon.expiresAt?.toDate
        ? coupon.expiresAt.toDate()
        : new Date(coupon.expiresAt)
      if (new Date() > expiry) {
        return NextResponse.json({ valid: false, error: 'This coupon has expired' })
      }
    }

    // Usage limit check
    if (coupon.maxUses > 0 && (coupon.usedCount || 0) >= coupon.maxUses) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has reached its usage limit',
      })
    }

    // Minimum order check
    if (coupon.minOrder > 0 && cartTotal < coupon.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of ₹${coupon.minOrder} required for this coupon`,
      })
    }

    const discount = calculateDiscount(coupon, cartTotal)

    return NextResponse.json({ valid: true, coupon, discount })
  } catch (err) {
    console.error('Coupon validation error:', err)
    return NextResponse.json(
      { valid: false, error: 'Validation failed. Please try again.' },
      { status: 500 }
    )
  }
}