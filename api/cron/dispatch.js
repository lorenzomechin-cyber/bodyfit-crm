import { supabase } from '../_lib/supabase.js'
import { sendWhatsApp } from '../_lib/whatsapp.js'
import { todayStr, tomorrowStr, daysTo, nowHour, dayOfWeek, isWorkday, formatDateFR } from '../_lib/helpers.js'

export default async function handler(req, res) {
  // Verify cron secret (Vercel sends this header)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const hour = nowHour()
  const dow = dayOfWeek()
  const results = []

  try {
    // Morning briefing: 7h, Mon-Sat
    if (hour === 7 && isWorkday()) {
      results.push(await morningBriefing())
    }

    // Reminder 24h: 21h every day (for tomorrow's bookings)
    if (hour === 21) {
      results.push(await reminder24h())
    }

    // Reminder 2h: every 30min during business hours, Mon-Sat
    if (hour >= 7 && hour <= 20 && isWorkday()) {
      results.push(await reminder2h())
    }

    // No-show detection: every hour during business, Mon-Sat
    if (hour >= 8 && hour <= 21 && isWorkday()) {
      results.push(await detectNoShows())
    }

    // Trial follow-up: 9h, Mon-Fri
    if (hour === 9 && dow >= 1 && dow <= 5) {
      results.push(await trialFollowUp())
    }

    // Renewal alert: 8h on Monday
    if (hour === 8 && dow === 1) {
      results.push(await renewalAlert())
    }

    // Birthday: 8h every day
    if (hour === 8) {
      results.push(await birthdayWish())
    }

    res.status(200).json({ ok: true, hour, dow, results })
  } catch (err) {
    console.error('[Dispatch] Error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ── Agent: Morning Briefing ─────────────────────────────────────
async function morningBriefing() {
  const today = todayStr()
  const ownerPhone = process.env.OWNER_PHONE

  // Today's bookings
  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('status', 'confirmed')
    .order('time_slot')

  // Expiring clients this week
  const { data: allClients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')

  const expiring = (allClients || []).filter(c => {
    if (!c.end_date) return false
    const dl = daysTo(today, c.end_date)
    return dl >= 0 && dl <= 7
  })

  // Trials to follow up
  const { data: trials } = await supabase
    .from('trials')
    .select('*')
    .in('follow_up_status', ['', 'noAnswer', 'msgSent'])
    .neq('stage', 'converted')
    .neq('stage', 'lost')

  const trialsToFollow = (trials || []).filter(tr => {
    const last = tr.last_action_date || tr.created_at_str || tr.date
    return !last || daysTo(last, today) >= 3
  })

  // Low credits
  const lowCredits = (allClients || []).filter(c => c.rem <= 3 && c.sub !== 'premium')

  // Build message
  const bkList = (todayBookings || []).map(b => `  ${b.time_slot} — ${b.client_name}${b.type === 'trial' ? ' (ESSAI)' : ''}`).join('\n')

  const msg = `☀️ *Bonjour ! Briefing BodyFit — ${formatDateFR(today)}*\n\n` +
    `📅 *${(todayBookings || []).length} séances aujourd'hui :*\n${bkList || '  Aucune réservation'}\n\n` +
    `⚠️ *Actions urgentes :*\n` +
    `  • ${expiring.length} contrat${expiring.length > 1 ? 's' : ''} expire${expiring.length > 1 ? 'nt' : ''} cette semaine\n` +
    `  • ${trialsToFollow.length} essai${trialsToFollow.length > 1 ? 's' : ''} à relancer\n` +
    `  • ${lowCredits.length} client${lowCredits.length > 1 ? 's' : ''} crédits bas\n\n` +
    `Bonne journée ! 💪`

  let sent = false
  if (ownerPhone) {
    const result = await sendWhatsApp(ownerPhone, msg)
    sent = result.ok
  }

  return { agent: 'morningBriefing', bookings: (todayBookings || []).length, expiring: expiring.length, trialsToFollow: trialsToFollow.length, lowCredits: lowCredits.length, sentToOwner: sent }
}

// ── Agent: Reminder 24h ─────────────────────────────────────────
async function reminder24h() {
  const tomorrow = tomorrowStr()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', tomorrow)
    .eq('status', 'confirmed')

  if (!bookings?.length) return { agent: 'reminder24h', sent: 0 }

  let sent = 0
  for (const b of bookings) {
    if (!b.client_phone) continue
    const msg = `Bonjour ${b.client_name || ''} ! 👋\n\nRappel de votre séance EMS demain ${formatDateFR(tomorrow)} à ${b.time_slot} chez BodyFit Campo de Ourique.\n\nÀ demain ! 💪`
    const result = await sendWhatsApp(b.client_phone, msg)
    if (result.ok) sent++
  }

  return { agent: 'reminder24h', bookings: bookings.length, sent }
}

// ── Agent: Reminder 2h ──────────────────────────────────────────
async function reminder2h() {
  const today = todayStr()
  const now = new Date()
  const in2h = new Date(now.getTime() + 2 * 3600000)
  const targetSlot = `${String(in2h.getHours()).padStart(2, '0')}:${String(Math.floor(in2h.getMinutes() / 30) * 30).padStart(2, '0')}`

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('time_slot', targetSlot)
    .eq('status', 'confirmed')

  if (!bookings?.length) return { agent: 'reminder2h', sent: 0 }

  let sent = 0
  for (const b of bookings) {
    if (!b.client_phone) continue
    const msg = `Bonjour ${b.client_name || ''} ! ⏰\n\nOn vous attend dans 2h à ${b.time_slot} chez BodyFit.\n\nÀ tout à l'heure !`
    const result = await sendWhatsApp(b.client_phone, msg)
    if (result.ok) sent++
  }

  return { agent: 'reminder2h', sent }
}

// ── Agent: No-show detection ────────────────────────────────────
async function detectNoShows() {
  const today = todayStr()
  const now = new Date()
  const currentSlot = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')}`

  // Find confirmed bookings from earlier today that haven't been marked completed
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('status', 'confirmed')
    .lt('time_slot', currentSlot)

  if (!bookings?.length) return { agent: 'noshow', detected: 0 }

  // Only flag as noshow if the slot was > 1h ago
  const oneHourAgo = new Date(now.getTime() - 3600000)
  const cutoffSlot = `${String(oneHourAgo.getHours()).padStart(2, '0')}:${String(Math.floor(oneHourAgo.getMinutes() / 30) * 30).padStart(2, '0')}`

  let detected = 0
  for (const b of bookings) {
    if (b.time_slot > cutoffSlot) continue // Not old enough

    await supabase.from('bookings').update({ status: 'noshow', updated_at: new Date().toISOString() }).eq('id', b.id)
    detected++

    // Send no-show follow-up
    if (b.client_phone) {
      const msg = `Bonjour ${b.client_name || ''}, nous avons remarqué votre absence aujourd'hui chez BodyFit. Souhaitez-vous reprogrammer votre séance ? 😊`
      await sendWhatsApp(b.client_phone, msg)
    }
  }

  return { agent: 'noshow', detected }
}

// ── Agent: Trial follow-up ──────────────────────────────────────
async function trialFollowUp() {
  const today = todayStr()

  const { data: trials } = await supabase
    .from('trials')
    .select('*')
    .in('follow_up_status', ['', 'noAnswer', 'msgSent'])
    .neq('stage', 'converted')
    .neq('stage', 'lost')

  if (!trials?.length) return { agent: 'trialFollowUp', sent: 0 }

  let sent = 0
  for (const tr of trials) {
    // Only follow up if last action > 3 days ago
    const lastAction = tr.last_action_date || tr.created_at_str || tr.date
    if (lastAction && daysTo(lastAction, today) < 3) continue
    if (!tr.phone) continue

    const msg = `Bonjour ${tr.name || ''} ! 👋\n\nC'est BodyFit Campo de Ourique. Nous espérons que votre séance d'essai EMS vous a plu !\n\nSouhaitez-vous en discuter ou réserver une nouvelle séance ? On serait ravis de vous revoir ! 💪`
    const result = await sendWhatsApp(tr.phone, msg)

    if (result.ok) {
      sent++
      await supabase.from('trials').update({
        follow_up_status: 'msgSent',
        last_action_date: today,
        contact_attempts: (tr.contact_attempts || 0) + 1
      }).eq('id', tr.id)
    }
  }

  return { agent: 'trialFollowUp', trials: trials.length, sent }
}

// ── Agent: Renewal alert ────────────────────────────────────────
async function renewalAlert() {
  const today = todayStr()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .not('end_date', 'is', null)

  if (!clients?.length) return { agent: 'renewalAlert', sent: 0 }

  let sent = 0
  for (const c of clients) {
    if (!c.end_date) continue
    const dl = daysTo(today, c.end_date)
    if (dl < 0 || dl > 14) continue // Only 0-14 days
    if (!c.phone) continue

    let msg
    if (dl <= 3) {
      msg = `Bonjour ${c.name || ''} ! ⚠️\n\nVotre abonnement BodyFit expire dans ${dl} jour${dl > 1 ? 's' : ''}. Contactez-nous pour renouveler et ne pas perdre vos acquis ! 💪`
    } else {
      msg = `Bonjour ${c.name || ''} ! 📋\n\nVotre abonnement BodyFit expire le ${formatDateFR(c.end_date)}. Pensez à le renouveler pour continuer votre progression ! 💪`
    }

    const result = await sendWhatsApp(c.phone, msg)
    if (result.ok) sent++
  }

  return { agent: 'renewalAlert', sent }
}

// ── Agent: Birthday wish ────────────────────────────────────────
async function birthdayWish() {
  const today = todayStr()
  const [, m, d] = today.split('-')

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .not('birth_date', 'is', null)

  if (!clients?.length) return { agent: 'birthday', sent: 0 }

  let sent = 0
  for (const c of clients) {
    if (!c.birth_date || !c.phone) continue
    const [, bm, bd] = c.birth_date.split('-')
    if (bm !== m || bd !== d) continue

    const msg = `Joyeux anniversaire ${c.name || ''} ! 🎂🎉\n\nToute l'équipe BodyFit vous souhaite une magnifique journée !\n\nÀ très bientôt au studio ! 💪`
    const result = await sendWhatsApp(c.phone, msg)
    if (result.ok) sent++
  }

  return { agent: 'birthday', sent }
}
