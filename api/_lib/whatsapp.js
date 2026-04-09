// WhatsApp Cloud API via Meta Business
// Requires: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID env vars
// Setup: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

const WA_API = 'https://graph.facebook.com/v21.0'

export async function sendWhatsApp(to, message) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID

  if (!token || !phoneId) {
    console.log('[WA] Not configured — would send to', to, ':', message)
    return { ok: false, reason: 'not_configured' }
  }

  // Normalize phone: remove spaces, ensure starts with country code
  const clean = to.replace(/[\s\-()]/g, '').replace(/^\+/, '')

  try {
    const res = await fetch(`${WA_API}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: clean,
        type: 'text',
        text: { body: message }
      })
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[WA] Error:', data)
      return { ok: false, error: data }
    }

    console.log('[WA] Sent to', clean)
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    console.error('[WA] Fetch error:', err)
    return { ok: false, error: err.message }
  }
}

