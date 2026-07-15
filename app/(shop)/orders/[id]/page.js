// src/app/(shop)/orders/[id]/page.js
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatTaxRate } from '@/utils/tax'
import {
  CheckCircle2, Package, MapPin, CreditCard, Banknote,
  Loader2, ChevronLeft,
} from 'lucide-react'
import { getOrderById } from '@/lib/firebase/orders'
import { formatPrice, formatDate } from '@/utils/formatters'
import { getOptimizedUrl } from '@/lib/cloudinary'

const STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const justPlaced = searchParams.get('success') === 'true'

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getOrderById(id)
      setOrder(result)
      setLoading(false)
    }
    if (id) load()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Order not found</h1>
        <Link href="/orders" className="text-indigo-600 font-medium hover:underline">
          View all orders
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      <Link
        href="/orders"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> All orders
      </Link>

      {/* Success banner */}
      {justPlaced && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Order placed successfully!</h1>
          <p className="text-sm text-gray-500">
            {order.paymentMethod === 'cod'
              ? "We'll notify you when your order ships. Pay cash on delivery."
              : 'Your payment was successful. A confirmation has been sent to your email.'}
          </p>
        </div>
      )}

      {/* Order header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-400">Order ID</p>
          <p className="font-mono text-sm font-medium text-gray-900">
            #{order.id.slice(0, 12).toUpperCase()}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${STATUS_STYLES[order.status] || ''}`}>
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
        </h2>
        <div className="space-y-4">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="relative w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                {item.image && (
                  <Image
                    src={getOptimizedUrl(item.image, { width: 128, height: 128 })}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery address */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          Delivery address
        </h2>
        <p className="text-sm font-medium text-gray-900">{order.shippingAddress?.fullName}</p>
        <p className="text-sm text-gray-500">
          {order.shippingAddress?.line1}
          {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
          {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
        </p>
        <p className="text-sm text-gray-400 mt-1">{order.shippingAddress?.phone}</p>
      </div>

      {/* Payment summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          {order.paymentMethod === 'cod' ? (
            <Banknote className="w-4 h-4 text-green-600" />
          ) : (
            <CreditCard className="w-4 h-4 text-indigo-600" />
          )}
          Payment summary
        </h2>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shipping</span>
            <span className="text-gray-900">
              {order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}
            </span>
          </div>

          {order.taxBreakdown?.length > 0 && (
            <div className="border-t border-gray-50 pt-3 mt-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                GST breakdown
              </p>
              {order.taxBreakdown.map((tb) => (
                <div key={tb.rate}>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Taxable value @ {tb.rate}%</span>
                    <span>{formatPrice(tb.baseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>CGST @ {tb.rate / 2}%</span>
                    <span>{formatPrice(tb.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>SGST @ {tb.rate / 2}%</span>
                    <span>{formatPrice(tb.sgst)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs font-semibold text-gray-700 pt-1 border-t border-gray-100">
                <span>Total GST</span>
                <span>{formatPrice(order.totalTax)}</span>
              </div>
            </div>
          )}



          {order.codFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">COD handling fee</span>
              <span className="text-gray-900">{formatPrice(order.codFee)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-baseline py-3 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Total paid</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          {order.paymentMethod === 'cod'
            ? 'Payment due on delivery'
            : `Paid via Razorpay${order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ''}`}
        </p>
        <p className="text-xs text-gray-400 mt-1">Ordered on {formatDate(order.createdAt)}</p>
      </div>
    </div>
  )
}