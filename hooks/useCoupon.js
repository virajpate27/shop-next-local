// src/hooks/useCoupon.js
'use client'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export function useCoupon() {
  const [code, setCode]           = useState('')
  const [coupon, setCoupon]       = useState(null)
  const [discount, setDiscount]   = useState(0)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const apply = useCallback(async (cartTotal) => {
    if (!code.trim()) {
      setError('Please enter a coupon code')
      return false
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), cartTotal }),
      })
      const data = await res.json()

      if (!data.valid) {
        setError(data.error || 'Invalid coupon')
        setCoupon(null)
        setDiscount(0)
        return false
      }

      setCoupon(data.coupon)
      setDiscount(data.discount)
      toast.success(
        data.coupon.discountType === 'free_shipping'
          ? 'Free shipping applied!'
          : data.coupon.discountType === 'percent'
          ? `${data.coupon.discountValue}% discount applied!`
          : `₹${data.discount} discount applied!`
      )
      return true
    } catch {
      setError('Could not validate coupon. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [code])

  const remove = useCallback(() => {
    setCode('')
    setCoupon(null)
    setDiscount(0)
    setError('')
    toast.success('Coupon removed')
  }, [])

  const isFreeShipping = coupon?.discountType === 'free_shipping'

  return {
    code, setCode,
    coupon, discount,
    loading, error,
    apply, remove,
    isFreeShipping,
  }
}