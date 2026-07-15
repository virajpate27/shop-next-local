// src/store/cartStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { calculateCartTax } from '@/utils/tax'

export const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items
        const existing = items.find((i) => i.productId === newItem.productId)

        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === newItem.productId
                ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                : i
            ),
          })
        } else {
          set({ items: [...items, { ...newItem, quantity: 1 }] })
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) { get().removeItem(productId); return }
        set({
          items: get().items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      // ── Tax-aware totals ────────────────────────────────────────────────
      getSubtotal: () => {
        const items = get().items
        if (!items?.length) return 0
        return items.reduce((sum, i) => {
          const price = Number(i.price) || 0
          const qty   = Number(i.quantity) || 0
          return sum + price * qty
        }, 0)
      },

      getTaxSummary: () => calculateCartTax(get().items),

      // Total including tax (for exclusive tax items, this is higher than subtotal)
      getTotal: () => {
        const items = get().items
        if (!items?.length) return 0
        const { totalAmount } = calculateCartTax(items)
        // Final safety net — if somehow NaN slips through, fall back to simple sum
        if (isNaN(totalAmount)) {
          return items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
        }
        return totalAmount
      },

      getItemCount: () => {
        const items = get().items
        if (!items?.length) return 0
        return items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
      },

      // ── Firestore sync ──────────────────────────────────────────────────
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