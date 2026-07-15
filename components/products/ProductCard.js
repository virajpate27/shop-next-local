// src/components/products/ProductCard.js
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Star, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'
import { useWishlist } from '@/hooks/useWishlist'
import { formatPrice, getDiscountPercent } from '@/utils/formatters'
import { getOptimizedUrl } from '@/lib/cloudinary'
import { DEFAULT_BLUR } from '@/utils/imageUtils'

export function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem)
  const { isWishlisted, toggle } = useWishlist()
  const discount = getDiscountPercent(product.price, product.comparePrice)
  const imageUrl = getOptimizedUrl(product.images?.[0], { width: 400, height: 400 })
  const saved = isWishlisted(product.id)

  function handleAddToCart(e) {
    e.preventDefault()
    if (product.stock === 0) return
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      stock: product.stock,
      taxRate: product.taxRate || 0,       
      taxType: product.taxType || 'inclusive', 
      category:  product.category || '', 
      slug:      product.slug     || '',
    })
    toast.success(`${product.name} added to cart`)
  }

  function handleWishlist(e) {
    e.preventDefault()
    toggle(product.id)
  }

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl ? (
           <Image
           src={imageUrl}
           alt={product.name}
           fill
           placeholder="blur"
           blurDataURL={DEFAULT_BLUR}
           className="object-cover group-hover:scale-105 transition-transform duration-500"
           sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
         />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ShoppingCart className="w-10 h-10" />
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount && (
              <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                -{discount}%
              </span>
            )}
            {product.stock === 0 && (
              <span className="bg-gray-800 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                Out of stock
              </span>
            )}
          </div>

          {/* Wishlist heart */}
          <button
            onClick={handleWishlist}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                saved ? 'fill-red-500 text-red-500' : 'text-gray-400'
              }`}
            />
          </button>
        </div>
      </Link>

      <div className="p-4">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">
          {product.category}
        </p>

        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= Math.round(product.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-200 fill-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice > product.price && (
              <span className="text-xs text-gray-400 line-through ml-2">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}