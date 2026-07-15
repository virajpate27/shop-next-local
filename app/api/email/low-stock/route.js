// src/app/api/email/low-stock/route.js
import { NextResponse } from 'next/server'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { sendEmail } from '@/lib/sendEmail'
import { ADMIN_EMAIL } from '@/lib/resend'
import { lowStockEmail } from '@/emails/templates'

// Call this route from a cron job or manually from admin dashboard
// e.g. GET /api/email/low-stock?secret=your_cron_secret

export async function GET(req) {
  // Simple secret check to prevent public access
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const snap = await getDocs(collection(db, 'products'))
    const lowStock = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.stock <= 10)

    if (lowStock.length === 0) {
      return NextResponse.json({ message: 'All products well stocked' })
    }

    const template = lowStockEmail({ products: lowStock })
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: template.subject,
      html: template.html,
    })

    return NextResponse.json({
      success: true,
      alerted: lowStock.length,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}