import { supabase } from '../_lib/supabase.js'
import { sendWhatsApp } from '../_lib/whatsapp.js'
import { todayStr, tomorrowStr, daysTo, nowHour, dayOfWeek, isWorkday, formatDateFR, detectLang, getMsg } from '../_lib/helpers.js'

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

    // Review request: 20h Mon-Sat
    if (hour === 20 && isWorkday()) {
      results.push(await reviewRequest())
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
  const ownerLang = process.env.OWNER_LANG || 'fr'
  const bkList = (todayBookings || []).map(b => `  ${b.time_slot} — ${b.client_name}${b.type === 'trial' ? ' (ESSAI)' : ''}`).join('\n')
  const msg = getMsg('morningBriefing', ownerLang, formatDateFR(today), bkList, expiring.length, trialsToFollow.length, lowCredits.length)

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
    const lang = detectLang(b.client_phone)
    const msg = getMsg('reminder24h', lang, b.client_name || '', formatDateFR(tomorrow), b.time_slot)
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
    const lang = detectLang(b.client_phone)
    const msg = getMsg('reminder2h', lang, b.client_name || '', b.time_slot)
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
      const lang = detectLang(b.client_phone)
      const msg = getMsg('noshow', lang, b.client_name || '')
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

    const lang = tr.lang || detectLang(tr.phone)
    const msg = getMsg('trialFollowUp', lang, tr.name || '')
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

    const lang = c.lang || detectLang(c.phone)
    let msg
    if (dl <= 3) {
      msg = getMsg('renewalAlert', lang, c.name || '', dl)
    } else {
      msg = getMsg('renewalSoft', lang, c.name || '', formatDateFR(c.end_date))
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

    const lang = c.lang || detectLang(c.phone)
    const msg = getMsg('birthday', lang, c.name || '')
    const result = await sendWhatsApp(c.phone, msg)
    if (result.ok) sent++
  }

  return { agent: 'birthday', sent }
}

// ── Agent: Review request ────────────────────────────────────────
async function reviewRequest() {
  const today = todayStr()
  const GOOGLE_REVIEW_URL = 'https://g.page/r/CZtvzg-F9CswEAE/review'

  // Get today's completed bookings
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('status', 'completed')

  if (!completedBookings?.length) return { agent: 'reviewRequest', sent: 0 }

  // Dedup: only send one review request per phone per day
  const sentPhones = new Set()
  let sent = 0
  for (const b of completedBookings) {
    if (!b.client_phone) continue
    if (sentPhones.has(b.client_phone)) continue

    const lang = detectLang(b.client_phone)
    const msg = getMsg('reviewRequest', lang, b.client_name || '', GOOGLE_REVIEW_URL)
    const result = await sendWhatsApp(b.client_phone, msg)

    if (result.ok) {
      sent++
      sentPhones.add(b.client_phone)
    }
  }

  return { agent: 'reviewRequest', sent }
}
