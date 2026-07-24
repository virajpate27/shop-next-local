// src/app/api/orders/confirm/route.js
import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore }                  from 'firebase-admin/firestore'

// Initialize Firebase Admin (server-side, full permissions)
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

    await Promise.all(items.map((item) => decrementProductStock(item)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Order confirm failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function decrementProductStock(item) {
  const { productId, variantId, quantity } = item

  // ── Fetch current product document ──────────────────────────────────
  const productRef = await fetchDoc('products', productId)
  if (!productRef) throw new Error(`Product ${productId} not found`)

  const updates = {}

  // ── Always decrement top-level stock ────────────────────────────────
  const currentStock = productRef.stock || 0
  updates.stock     = Math.max(0, currentStock - quantity)
  updates.soldCount = (productRef.soldCount || 0) + quantity

  // ── Also decrement variant stock if this is a variation product ──────
  if (variantId && productRef.variants?.length) {
    const updatedVariants = productRef.variants.map((variant) => {
      if (variant.id === variantId) {
        return {
          ...variant,
          stock: Math.max(0, (Number(variant.stock) || 0) - quantity),
        }
      }
      return variant
    })
    updates.variants = updatedVariants
  }

  // ── Write back ───────────────────────────────────────────────────────
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