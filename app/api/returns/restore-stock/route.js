import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Firebase Admin singleton ───────────────────────────────────────────────
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

// ── Main handler ───────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { items } = await req.json()

    if (!items?.length) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Process all items in parallel
    await Promise.all(
      items.map((item) => restoreProductStock(db, item))
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Stock restore failed:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── Restore both top-level stock and variant stock ─────────────────────────
async function restoreProductStock(db, item) {
  const { productId, variantId, returnQty } = item

  if (!productId || !returnQty) return

  const productRef  = db.collection('products').doc(productId)
  const productSnap = await productRef.get()

  if (!productSnap.exists) {
    console.warn(`Product ${productId} not found — skipping stock restore`)
    return
  }

  const product = productSnap.data()
  const updates = {}

  // ── Top-level stock (always restored) ───────────────────────────────────
  const currentStock = Number(product.stock) || 0
  updates.stock      = currentStock + returnQty
  updates.soldCount  = Math.max(0, (Number(product.soldCount) || 0) - returnQty)

  // ── Variant stock (only if product has variations and variantId provided) ─
  if (variantId && product.variants?.length) {
    let variantFound = false

    const updatedVariants = product.variants.map((variant) => {
      if (variant.id === variantId) {
        variantFound = true
        const currentVariantStock = Number(variant.stock) || 0
        return {
          ...variant,
          stock: currentVariantStock + returnQty,
        }
      }
      return variant
    })

    if (variantFound) {
      updates.variants = updatedVariants
    } else {
      console.warn(
        `Variant ${variantId} not found in product ${productId} — only top-level stock restored`
      )
    }
  }

  await productRef.update(updates)
}