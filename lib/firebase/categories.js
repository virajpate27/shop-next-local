// src/lib/firebase/categories.js
import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    serverTimestamp,
  } from 'firebase/firestore'
  import { db } from './config'
  
  export async function getCategories() {
    const snap = await getDocs(collection(db, 'categories'))
    const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return cats.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  export async function createCategory(data) {
    const ref = await addDoc(collection(db, 'categories'), {
      ...data,
      slug: generateCategorySlug(data.name),
      createdAt: serverTimestamp(),
    })
    return ref.id
  }
  
  export async function updateCategory(id, data) {
    await updateDoc(doc(db, 'categories', id), {
      ...data,
      slug: generateCategorySlug(data.name),
      updatedAt: serverTimestamp(),
    })
  }
  
  export async function deleteCategory(id) {
    await deleteDoc(doc(db, 'categories', id))
  }
  
  function generateCategorySlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }