// src/app/api/returns/restore-stock/route.js
import { NextResponse } from 'next/server'
import { adminDb, FieldValue } from '@/lib/firebase/admin'

export async function POST(req) {
  try {
    const { items } = await req.json()

    if (!items?.length) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      )
    }

    // Increment stock for each returned item
    const batch = adminDb.batch()

    items.forEach((item) => {
      if (!item.productId || !item.returnQty) return
      const ref = adminDb.collection('products').doc(item.productId)
      batch.update(ref, {
        stock:     FieldValue.increment(item.returnQty),
        soldCount: FieldValue.increment(-item.returnQty),
      })
    })

    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Stock restore failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}