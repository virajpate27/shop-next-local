// src/app/(shop)/orders/page.js
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { Package, ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase/config'
import { formatPrice, formatDate } from '@/utils/formatters'
import { OrderCardSkeleton } from '@/components/ui/Skeletons';
import { triggerEmail } from '@/lib/triggerEmail'

const STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/orders')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return
      setLoading(true)
      try {
        // Client-side sort to avoid composite index requirement
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid))
        const snap = await getDocs(q)
        const results = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const toMs = (v) => (v?.toDate ? v.toDate().getTime() : 0)
            return toMs(b.createdAt) - toMs(a.createdAt)
          })
        setOrders(results) 
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My orders</h1>

      {loading ? (
       <div className="space-y-4">
       {Array.from({ length: 4 }).map((_, i) => (
         <OrderCardSkeleton key={i} />
       ))}
     </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-400 text-sm mb-6">When you place an order, itll show up here.</p>
          <Link
            href="/products"
            className="inline-flex bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] || ''}`}>
                  {order.status}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatPrice(order.total)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}