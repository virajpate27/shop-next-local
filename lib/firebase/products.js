// src/lib/firebase/products.js 
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './config';

// ─── READ ────────────────────────────────────────────────────────────────────

export async function getProducts({
  category = null,
  search = null,
  sortBy = 'newest',
  featured = false,
  pageSize = 12,
  lastDoc = null,
} = {}) {
  // Fetch all products — filter + sort client-side to avoid composite index
  const snap = await getDocs(collection(db, 'products'));
  let products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ── Filter ──────────────────────────────────────────────────────────────
  if (category) {
    products = products.filter((p) => p.category === category);
  }

  if (featured) {
    products = products.filter((p) => p.featured === true);
  }

  if (search) {
    const q = search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // ── Sort ─────────────────────────────────────────────────────────────────
  const toMs = (v) => {
    if (!v) return 0;
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    return 0;
  };

  switch (sortBy) {
    case 'price_asc':
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price_desc':
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'popular':
      products.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
    case 'oldest':
      products.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
      break;
    case 'newest':
    default:
      products.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      break;
  }

  // ── Paginate ─────────────────────────────────────────────────────────────
  const total = products.length;

  // lastDoc here is a numeric offset index (not a Firestore DocumentSnapshot)
  const offset = lastDoc ?? 0;
  const page = products.slice(offset, offset + pageSize);

  return {
    products: page,
    lastVisible: offset + page.length, // next offset
    hasMore: offset + page.length < total,
  };
}

export async function getProductBySlug(slug) {
  const snap = await getDocs(collection(db, 'products'));
  const doc = snap.docs.find((d) => d.data().slug === slug);
  if (!doc) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getProductById(id) {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getFeaturedProducts(count = 8) {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.featured === true)
    .sort((a, b) => {
      const toMs = (v) => (v?.toDate ? v.toDate().getTime() : 0);
      return toMs(b.createdAt) - toMs(a.createdAt);
    })
    .slice(0, count);
}

export async function getRelatedProducts(category, excludeId, count = 4) {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.category === category && p.id !== excludeId)
    .slice(0, count);
}

// ─── WRITE ───────────────────────────────────────────────────────────────────

export async function createProduct(data) {
  const ref = await addDoc(collection(db, 'products'), {
    ...data,
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id, data) {
  await updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, 'products', id));
}

export async function decrementStock(id, quantity = 1) {
  await updateDoc(doc(db, 'products', id), {
    stock: increment(-quantity),
    soldCount: increment(quantity),
  });
}

export async function getCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
