// src/app/sitemap.js
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Product pages — server-side fetch
  let productPages = []
  try {
    const snap = await getDocs(collection(db, 'products'))
    productPages = snap.docs
      .map((d) => d.data())
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: p.updatedAt?.toDate ? p.updatedAt.toDate() : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
  } catch {
    // If Firebase is unavailable during build, skip product pages
  }

  return [...staticPages, ...productPages]
}