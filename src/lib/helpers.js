import { SUB, BUSINESS_HOURS, SLOT_DURATION, MAX_MACHINES, CANCEL_CUTOFF_HOURS } from './constants'

export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9)

export const daysTo = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 864e5)

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014"

export const calcAge = (bd) => {
  if (!bd) return null
  const t = new Date(), b = new Date(bd)
  let a = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--
  return a > 0 && a < 120 ? a : null
}

export const getLastSession = (c) => {
  if (!c.sessions?.length) return null
  return [...c.sessions].sort((a, b) => b.date.localeCompare(a.date))[0].date
}

export const getDaysInactive = (c) => {
  const ls = getLastSession(c)
  if (!ls) return 999
  return daysTo(ls, new Date().toISOString().split("T")[0])
}

export const getFrequency = (c) => {
  if (!c.sessions?.length || !c.startDate) return 0
  const months = Math.max(1, daysTo(c.startDate, new Date().toISOString().split("T")[0]) / 30)
  return Math.round(c.sessions.length / months * 10) / 10
}

export const getActiveSuspension = (c) => c.suspensionHistory?.find(s => {
  const td = new Date().toISOString().split("T")[0]
  return s.from <= td && (!s.to || s.to >= td)
})

export const getLastPaymentMonth = (c) => {
  if (!c.startDate || !c.sub || c.sub === "premium") return null
  const sub = SUB[c.sub]
  if (!sub?.mo) return null
  const start = new Date(c.startDate)
  const lm = new Date(start.getFullYear(), start.getMonth() + sub.mo - 1, 1)
  const now = new Date()
  const nowM = now.getFullYear() * 12 + now.getMonth()
  const lmM = lm.getFullYear() * 12 + lm.getMonth()
  return {
    month: lm.getMonth(), year: lm.getFullYear(),
    label: lm.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    isThisMonth: nowM === lmM, isNextMonth: lmM === nowM + 1, isPast: lmM < nowM, monthsLeft: lmM - nowM
  }
}

export const getAdjustedEndDate = (c) => {
  if (!c.endDate || !c.suspensionHistory?.length) return c.endDate
  let extra = 0
  c.suspensionHistory.forEach(s => { extra += (s.daysAdded || 0) })
  const d = new Date(c.endDate)
  d.setDate(d.getDate() + extra)
  return d.toISOString().split("T")[0]
}

export function generateSlots(date) {
  const day = new Date(date + "T12:00:00").getDay()
  const hours = BUSINESS_HOURS[day]
  if (!hours) return []
  const slots = []
  const [oh, om] = hours.open.split(":").map(Number)
  const [ch, cm] = hours.close.split(":").map(Number)
  let mins = oh * 60 + om
  const end = ch * 60 + cm
  while (mins < end) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`)
    mins += SLOT_DURATION
  }
  return slots
}

export function getSlotCounts(bookings, date) {
  const counts = {}
  bookings.forEach(b => {
    if (b.date === date && (b.status === "confirmed" || b.status === "completed")) {
      counts[b.timeSlot] = (counts[b.timeSlot] || 0) + 1
    }
  })
  return counts
}

export function canCancel(booking) {
  const now = new Date()
  const st = new Date(`${booking.date}T${booking.timeSlot}:00`)
  return (st - now) > CANCEL_CUTOFF_HOURS * 3600000
}

export function isSlotAvailable(bookings, date, timeSlot) {
  const count = bookings.filter(b => b.date === date && b.timeSlot === timeSlot && (b.status === "confirmed" || b.status === "completed")).length
  return count < MAX_MACHINES
}

export function waLink(phone, message) {
  if (!phone) return null
  const clean = phone.replace(/[^+\d]/g, '')
  return `https://wa.me/${clean.replace('+', '')}?text=${encodeURIComponent(message)}`
}

export function detectLang(phone) {
  if (!phone) return 'pt'
  const clean = phone.replace(/[\s\-()]/g, '')
  if (clean.startsWith('+351') || clean.startsWith('351')) return 'pt'
  if (clean.startsWith('+33') || clean.startsWith('33')) return 'fr'
  if (clean.startsWith('+55') || clean.startsWith('55')) return 'pt' // Brazil
  return 'en'
}

const WA_MSG = {
  greeting: { pt: n => `Olá ${n}! É a BodyFit Campo de Ourique 💪`, fr: n => `Bonjour ${n} ! C'est BodyFit Campo de Ourique 💪`, en: n => `Hi ${n}! This is BodyFit Campo de Ourique 💪` },
  trialReminder: { pt: n => `Olá ${n}! Lembramos da sua sessão de teste EMS prevista na BodyFit Campo de Ourique. Esperamos por si! 💪`, fr: n => `Bonjour ${n} ! On vous rappelle votre séance d'essai EMS prévue chez BodyFit Campo de Ourique. On a hâte de vous voir ! 💪`, en: n => `Hi ${n}! Reminder of your EMS trial session at BodyFit Campo de Ourique. We look forward to seeing you! 💪` },
  sessionReminder: { pt: (n, t) => `Olá ${n}! Lembrete da sua sessão EMS amanhã às ${t} na BodyFit. Até amanhã! 💪`, fr: (n, t) => `Bonjour ${n} ! Rappel de votre séance EMS demain à ${t} chez BodyFit. À demain ! 💪`, en: (n, t) => `Hi ${n}! Reminder of your EMS session tomorrow at ${t} at BodyFit. See you tomorrow! 💪` },
  noshow: { pt: n => `Olá ${n}, reparámos na sua ausência hoje na BodyFit. Gostaria de remarcar a sua sessão? 😊`, fr: n => `Bonjour ${n}, nous avons remarqué votre absence aujourd'hui chez BodyFit. Souhaitez-vous reprogrammer votre séance ? 😊`, en: n => `Hi ${n}, we noticed your absence today at BodyFit. Would you like to reschedule your session? 😊` },
  review: { pt: (n, url) => `Obrigado pela sua sessão hoje ${n}! 💪\n\nSe tiver 30 segundos, uma avaliação no Google ajuda-nos imenso:\n${url}\n\nObrigado! 🙏`, fr: (n, url) => `Merci pour votre séance aujourd'hui ${n} ! 💪\n\nSi vous avez 30 secondes, un avis Google nous aide énormément :\n${url}\n\nMerci ! 🙏`, en: (n, url) => `Thanks for your session today ${n}! 💪\n\nIf you have 30 seconds, a Google review helps us a lot:\n${url}\n\nThank you! 🙏` },
  todayReminder: { pt: (n, t) => `Olá ${n}, lembrete da sua sessão BodyFit hoje às ${t}. Até já!`, fr: (n, t) => `Bonjour ${n}, rappel de votre séance BodyFit aujourd'hui à ${t}. À tout à l'heure !`, en: (n, t) => `Hi ${n}, reminder of your BodyFit session today at ${t}. See you soon!` },
  trialFollowUp: { pt: n => `Olá ${n}, após a sua sessão de teste na BodyFit, gostaria de agendar uma nova sessão?`, fr: n => `Bonjour ${n}, suite à votre séance d'essai chez BodyFit, souhaitez-vous programmer une nouvelle session ?`, en: n => `Hi ${n}, after your trial session at BodyFit, would you like to schedule a new session?` },
  renewalAlert: { pt: (n, d) => `Olá ${n}, a sua subscrição BodyFit expira em ${d} dia(s). Contacte-nos para renovar!`, fr: (n, d) => `Bonjour ${n}, votre abonnement BodyFit expire dans ${d} jour(s). Contactez-nous pour renouveler !`, en: (n, d) => `Hi ${n}, your BodyFit subscription expires in ${d} day(s). Contact us to renew!` },
  lowCredits: { pt: (n, r) => `Olá ${n}, restam-lhe ${r} crédito(s) BodyFit. Pense em renovar o seu pack!`, fr: (n, r) => `Bonjour ${n}, il vous reste ${r} crédit(s) BodyFit. Pensez à renouveler votre pack !`, en: (n, r) => `Hi ${n}, you have ${r} credit(s) left at BodyFit. Consider renewing your pack!` },
}

export function waMsg(key, lang, ...args) {
  const t = WA_MSG[key]
  if (!t) return ''
  const fn = t[lang] || t['pt']
  return fn(...args)
}

export function generateReferralCode(name) {
  const clean = (name || 'BF').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${clean}-${rand}`
}

export function getAvailabilityForDate(bookings, date) {
  const slots = generateSlots(date)
  if (slots.length === 0) return { total: 0, booked: 0, available: 0 }
  const total = slots.length * MAX_MACHINES
  let booked = 0
  slots.forEach(slot => {
    booked += bookings.filter(b => b.date === date && b.timeSlot === slot && (b.status === "confirmed" || b.status === "completed")).length
  })
  return { total, booked, available: total - booked }
}
