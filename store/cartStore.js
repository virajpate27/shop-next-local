// src/store/cartStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { calculateCartTax } from '@/utils/tax'

// ── Cart item key — unique per product+variant combination ─────────────────
// Products without variations: key = productId
// Products with variations:    key = productId__variantId
function cartItemKey(productId, variantId) {
  return variantId ? `${productId}__${variantId}` : productId
}

export const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items
        const key = cartItemKey(newItem.productId, newItem.variantId)

        // Match on productId + variantId — different variants = different cart lines
        const existingIndex = items.findIndex(
          (i) => cartItemKey(i.productId, i.variantId) === key
        )

        if (existingIndex !== -1) {
          // Same product AND same variant → increment quantity
          const existing = items[existingIndex]
          const newQty = Math.min(existing.quantity + 1, existing.stock)
          set({
            items: items.map((item, idx) =>
              idx === existingIndex ? { ...item, quantity: newQty } : item
            ),
          })
        } else {
          // Different variant (or no variant) → new cart line
          set({ items: [...items, { ...newItem, quantity: 1 }] })
        }
      },

      removeItem: (productId, variantId = null) => {
        const key = cartItemKey(productId, variantId)
        set({
          items: get().items.filter(
            (i) => cartItemKey(i.productId, i.variantId) !== key
          ),
        })
      },

      updateQuantity: (productId, quantity, variantId = null) => {
        const key = cartItemKey(productId, variantId)
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set({
          items: get().items.map((i) =>
            cartItemKey(i.productId, i.variantId) === key
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        const items = get().items
        if (!items?.length) return 0
        return items.reduce(
          (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
          0
        )
      },

      getTaxSummary: () => calculateCartTax(get().items),

      getTotal: () => {
        const items = get().items
        if (!items?.length) return 0
        const { totalAmount } = calculateCartTax(items)
        if (isNaN(totalAmount)) {
          return items.reduce(
            (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
            0
          )
        }
        return totalAmount
      },

      getItemCount: () => {
        const items = get().items
        if (!items?.length) return 0
        return items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
      },

      syncToFirestore: async (userId) => {
        if (!userId) return
        try {
          await setDoc(doc(db, 'carts', userId), {
            items: get().items,
            updatedAt: new Date().toISOString(),
          })
        } catch (err) {
          console.error('Cart sync failed:', err)
        }
      },

      loadFromFirestore: async (userId) => {
        if (!userId) return
        try {
          const snap = await getDoc(doc(db, 'carts', userId))
          if (snap.exists() && snap.data().items?.length) {
            if (get().items.length === 0) set({ items: snap.data().items })
          }
        } catch (err) {
          console.error('Cart load failed:', err)
        }
      },
    }),
    { name: 'shopnext-cart' }
  )
)