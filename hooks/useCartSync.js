// src/hooks/useCartSync.js
'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCartStore } from '@/store/cartStore'

export function useCartSync() {
  const { user } = useAuth()
  const items = useCartStore((s) => s.items)
  const syncToFirestore = useCartStore((s) => s.syncToFirestore)
  const loadFromFirestore = useCartStore((s) => s.loadFromFirestore)
  const hasLoaded = useRef(false)

  // Load cart from Firestore once when user logs in
  useEffect(() => {
    if (user && !hasLoaded.current) {
      loadFromFirestore(user.uid)
      hasLoaded.current = true
    }
    if (!user) {
      hasLoaded.current = false
    }
  }, [user, loadFromFirestore])

  // Debounced sync to Firestore whenever cart items change
  useEffect(() => {
    if (!user || !hasLoaded.current) return
    const timeout = setTimeout(() => {
      syncToFirestore(user.uid)
    }, 800)
    return () => clearTimeout(timeout)
  }, [items, user, syncToFirestore])
}