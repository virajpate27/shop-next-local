// src/app/api/coupons/validate/route.js
import { NextResponse } from 'next/server'
import { validateCoupon } from '@/lib/firebase/coupons'

export async function POST(req) {
  try {
    const { code, cartTotal } = await req.json()

    if (!code?.trim()) {
      return NextResponse.json({ valid: false, error: 'Please enter a coupon code' }, { status: 400 })
    }
    if (!cartTotal || cartTotal <= 0) {
      return NextResponse.json({ valid: false, error: 'Cart is empty' }, { status: 400 })
    }

    const result = await validateCoupon(code.trim(), cartTotal)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Coupon validation error:', err)
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 })
  }
}