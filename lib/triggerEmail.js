// src/lib/triggerEmail.js
export async function triggerEmail(type, to, data) {
  // Skip silently if no recipient
  if (!to) {
    console.warn(`triggerEmail [${type}]: No recipient provided, skipping`)
    return false
  }

  try {
    // Use absolute URL — required in some environments
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://shopnext-c0ii--3000--29a3b5f7.local-credentialless.webcontainer.io')

    const res = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error(`Email trigger failed [${type}]:`, result)
      return false
    }

    console.log(`Email sent [${type}] to ${to}:`, result.id)
    return true
  } catch (err) {
    console.error(`Email trigger error [${type}]:`, err.message)
    return false
  }
}