// src/lib/resend.js
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM = process.env.EMAIL_FROM || 'ShopNext <onboarding@resend.dev>'
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL