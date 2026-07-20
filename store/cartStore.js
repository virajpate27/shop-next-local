// src/store/cartStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { calculateCartTax } from '@/utils/tax'

function cartItemKey(productId, variantId) {
  return variantId ? `${productId}__${variantId}` : productId
}

export const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],

      // ── Coupon state persisted alongside cart ──────────────────────────
      appliedCoupon:   null,   // full coupon object
      couponDiscount:  0,      // rupee amount saved

      // ── Coupon actions ─────────────────────────────────────────────────
      setCoupon: (coupon, discount) => {
        set({ appliedCoupon: coupon, couponDiscount: discount })
      },

      removeCoupon: () => {
        set({ appliedCoupon: null, couponDiscount: 0 })
      },

      // ── Item actions ───────────────────────────────────────────────────
      addItem: (newItem) => {
        const items = get().items
        const key = cartItemKey(newItem.productId, newItem.variantId)
        const existingIndex = items.findIndex(
          (i) => cartItemKey(i.productId, i.variantId) === key
        )

        if (existingIndex !== -1) {
          const existing = items[existingIndex]
          const newQty = Math.min(existing.quantity + 1, existing.stock)
          set({
            items: items.map((item, idx) =>
              idx === existingIndex ? { ...item, quantity: newQty } : item
            ),
          })
        } else {
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

      // Clear cart AND coupon after order placed
      clearCart: () => set({
        items:           [],
        appliedCoupon:   null,
        couponDiscount:  0,
      }),

      // ── Totals ─────────────────────────────────────────────────────────
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
            items:          get().items,
            appliedCoupon:  get().appliedCoupon,
            couponDiscount: get().couponDiscount,
            updatedAt:      new Date().toISOString(),
          })
        } catch (err) {
          console.error('Cart sync failed:', err)
        }
      },

      loadFromFirestore: async (userId) => {
        if (!userId) return
        try {
          const snap = await getDoc(doc(db, 'carts', userId))
          if (snap.exists()) {
            const data = snap.data()
            if (data.items?.length && get().items.length === 0) {
              set({
                items:          data.items          || [],
                appliedCoupon:  data.appliedCoupon  || null,
                couponDiscount: data.couponDiscount || 0,
              })
            }
          }
        } catch (err) {
          console.error('Cart load failed:', err)
        }
      },
    }),
    {
      name: 'shopnext-cart',
      // Only persist these keys to localStorage
      partialize: (state) => ({
        items:          state.items,
        appliedCoupon:  state.appliedCoupon,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
)