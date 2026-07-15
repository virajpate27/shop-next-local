// src/lib/firebase/reviews.js
import {
    collection, doc, addDoc, getDocs, query,
    where, orderBy, updateDoc, increment, serverTimestamp,
  } from 'firebase/firestore'
  import { db } from './config'
  
  export async function getReviews(productId) {
    const snap = await getDocs(
      query(
        collection(db, 'reviews'),
        where('productId', '==', productId)
      )
    )
    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    // client-side sort to avoid composite index
    return reviews.sort((a, b) => {
      const toMs = (v) => (v?.toDate ? v.toDate().getTime() : 0)
      return toMs(b.createdAt) - toMs(a.createdAt)
    })
  }
  
  export async function getUserReview(productId, userId) {
    const snap = await getDocs(
      query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('userId', '==', userId)
      )
    )
    if (snap.empty) return null
    return { id: snap.docs[0].id, ...snap.docs[0].data() }
  }
  
  export async function addReview(productId, userId, displayName, { rating, comment }) {
    const ref = await addDoc(collection(db, 'reviews'), {
      productId,
      userId,
      displayName,
      rating,
      comment: comment.trim(),
      helpful: 0,
      createdAt: serverTimestamp(),
    })
  
    // Update product aggregate rating
    const reviewsSnap = await getDocs(
      query(collection(db, 'reviews'), where('productId', '==', productId))
    )
    const all = reviewsSnap.docs.map((d) => d.data().rating)
    const avg = all.reduce((a, b) => a + b, 0) / all.length
  
    await updateDoc(doc(db, 'products', productId), {
      rating: Math.round(avg * 10) / 10,
      reviewCount: all.length,
    })
  
    return ref.id
  }
  
  export async function markHelpful(reviewId) {
    await updateDoc(doc(db, 'reviews', reviewId), {
      helpful: increment(1),
    })
  }