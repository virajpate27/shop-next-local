// src/app/api/email/send/route.js
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req) {
  try {
    // ── Step 1: Check env var is loaded ─────────────────────────
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not set in environment variables' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { type, to, data } = body

    if (!type || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to' },
        { status: 400 }
      )
    }

    // ── Step 2: Build template ───────────────────────────────────
    const { getEmailTemplate } = await import('@/emails/templates')
    const template = getEmailTemplate(type, data)

    if (!template) {
      return NextResponse.json(
        { error: `Unknown email type: ${type}` },
        { status: 400 }
      )
    }

    // ── Step 3: Send via Resend ──────────────────────────────────
    const resend = new Resend(apiKey)

    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    const toAddress = Array.isArray(to) ? to : [to]

    console.log('Sending email:', { type, to: toAddress, from: fromAddress })

    const { data: result, error } = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: template.subject,
      html: template.html,
    })

    if (error) {
      console.error('Resend API error:', JSON.stringify(error))
      return NextResponse.json(
        { error: error.message || 'Resend API error', details: error },
        { status: 500 }
      )
    }

    console.log('Email sent successfully:', result?.id)
    return NextResponse.json({ success: true, id: result?.id })

  } catch (err) {
    console.error('Email route crashed:', err.message, err.stack)
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    )
  }
}