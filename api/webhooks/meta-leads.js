import { supabase } from '../_lib/supabase.js'
import { sendWhatsApp } from '../_lib/whatsapp.js'
import { todayStr } from '../_lib/helpers.js'

export default async function handler(req, res) {
  // Meta webhook verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Meta webhook data (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body
      const entries = body?.entry || []

      for (const entry of entries) {
        const changes = entry.changes || []
        for (const change of changes) {
          if (change.field !== 'leadgen') continue
          const leadgenId = change.value?.leadgen_id
          if (!leadgenId) continue

          // Fetch lead data from Meta API
          const leadRes = await fetch(
            `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${process.env.META_ACCESS_TOKEN}`
          )
          const leadData = await leadRes.json()

          if (!leadData?.field_data) continue

          // Extract fields
          const fields = {}
          leadData.field_data.forEach(f => { fields[f.name] = f.values?.[0] || '' })

          const name = fields.full_name || fields.nome || fields.name || ''
          const email = fields.email || ''
          const phone = fields.phone_number || fields.phone || ''

          if (!name && !phone) continue

          const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
          const today = todayStr()

          // Insert into Supabase
          await supabase.from('leads').upsert({
            id,
            name,
            email,
            phone: phone.replace(/[\s\-]/g, ''),
            stage: 'notContacted',
            source: 'meta_ads',
            date: today,
            notes: `Lead Meta Ads #${leadgenId}`,
            contact_attempts: 0,
            created_at_str: today,
            last_action_date: '',
            next_callback: '',
            address: '',
            birth_date: '',
            nif: '',
            origin: 'Meta Ads',
            follow_up_status: ''
          }, { onConflict: 'id' })

          // Send welcome WhatsApp
          if (phone) {
            await sendWhatsApp(phone,
              `Bonjour ${name || ''} ! 👋\n\nMerci pour votre intérêt pour BodyFit Campo de Ourique ! 💪\n\nNous allons vous contacter très bientôt pour programmer votre séance d'essai EMS gratuite.\n\nÀ très vite !`
            )
          }
        }
      }

      res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[Meta Webhook] Error:', err)
      res.status(500).json({ error: err.message })
    }
  }
}
