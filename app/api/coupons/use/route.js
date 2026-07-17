// src/app/api/coupons/use/route.js
import { NextResponse } from 'next/server'
import { adminDb, FieldValue } from '@/lib/firebase/admin'

export async function POST(req) {
  try {
    const { couponId } = await req.json()
    if (!couponId) {
      return NextResponse.json({ error: 'Missing couponId' }, { status: 400 })
    }
    await adminDb.collection('coupons').doc(couponId).update({
      usedCount: FieldValue.increment(1),
      updatedAt: new Date(),
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to increment coupon usage:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}