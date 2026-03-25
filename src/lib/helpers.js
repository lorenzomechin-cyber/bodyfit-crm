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
