// src/app/api/returns/restore-stock/route.js
import { NextResponse } from 'next/server'
import { adminDb, FieldValue } from '@/lib/firebase/admin'

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

export async function POST(req) {
  try {
    const { items } = await req.json()

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    await Promise.all(items.map((item) => restoreProductStock(item)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Stock restore failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function restoreProductStock(item) {
  const { productId, variantId, returnQty } = item
  if (!productId || !returnQty) return

  const productRef = await fetchDoc('products', productId)
  if (!productRef) throw new Error(`Product ${productId} not found`)

  const updates = {}

  // Restore top-level stock
  updates.stock     = (productRef.stock     || 0) + returnQty
  updates.soldCount = Math.max(0, (productRef.soldCount || 0) - returnQty)

  // Restore variant stock if applicable
  if (variantId && productRef.variants?.length) {
    const updatedVariants = productRef.variants.map((variant) => {
      if (variant.id === variantId) {
        return {
          ...variant,
          stock: (Number(variant.stock) || 0) + returnQty,
        }
      }
      return variant
    })
    updates.variants = updatedVariants
  }

  await patchDoc('products', productId, updates)
}

async function fetchDoc(collection, id) {
  const db   = getAdminDb()
  const snap = await db.collection(collection).doc(id).get()
  if (!snap.exists) return null
  return snap.data()
}

async function patchDoc(collection, id, fields) {
  const db = getAdminDb()
  await db.collection(collection).doc(id).update(fields)
}