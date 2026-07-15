// src/app/api/orders/confirm/route.js
import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Initialize Firebase Admin (server-side, full permissions)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const adminDb = getFirestore()

export async function POST(req) {
  try {
    const { orderId, items } = await req.json()

    if (!orderId || !items?.length) {
      return NextResponse.json(
        { error: 'Missing orderId or items' },
        { status: 400 }
      )
    }

    // Decrement stock for each item using Admin SDK (bypasses client rules)
    const batch = adminDb.batch()

    items.forEach((item) => {
      const productRef = adminDb.collection('products').doc(item.productId)
      batch.update(productRef, {
        stock: FieldValue.increment(-item.quantity),
        soldCount: FieldValue.increment(item.quantity),
      })
    })

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Order confirm failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}