import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// DB mappers
export function dbToClient(r) {
  return {
    id: r.id, name: r.name, status: r.status, gender: r.gender, phone: r.phone, email: r.email,
    startDate: r.start_date, endDate: r.end_date, source: r.source, sub: r.sub,
    credits: r.credits, used: r.used, bonus: r.bonus, rem: r.rem, notes: r.notes,
    nif: r.nif, birthDate: r.birth_date, contraindications: r.contraindications,
    medicalNotes: r.medical_notes, sessions: r.sessions || [],
    suspensionHistory: r.suspension_history || [], renewalHistory: r.renewal_history || [],
    referralCode: r.referral_code || '', referredBy: r.referred_by || '',
    referralCount: r.referral_count || 0, referralBonus: r.referral_bonus || 0
  }
}

export function clientToDb(c) {
  return {
    id: c.id, name: c.name, status: c.status, gender: c.gender, phone: c.phone, email: c.email,
    start_date: c.startDate, end_date: c.endDate, source: c.source, sub: c.sub,
    credits: c.credits, used: c.used, bonus: c.bonus, rem: c.rem, notes: c.notes,
    nif: c.nif, birth_date: c.birthDate, contraindications: c.contraindications,
    medical_notes: c.medicalNotes, sessions: c.sessions || [],
    suspension_history: c.suspensionHistory || [], renewal_history: c.renewalHistory || []
  }
}

export function dbToLead(r) {
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone, stage: r.stage, notes: r.notes,
    source: r.source, date: r.date, contactAttempts: r.contact_attempts,
    createdAt: r.created_at_str, lastActionDate: r.last_action_date, nextCallback: r.next_callback,
    address: r.address, birthDate: r.birth_date, nif: r.nif, origin: r.origin,
    followUpStatus: r.follow_up_status
  }
}

export function leadToDb(l) {
  return {
    id: l.id, name: l.name, email: l.email, phone: l.phone, stage: l.stage, notes: l.notes,
    source: l.source, date: l.date, contact_attempts: l.contactAttempts || 0,
    created_at_str: l.createdAt || "", last_action_date: l.lastActionDate || "",
    next_callback: l.nextCallback || "", address: l.address || "", birth_date: l.birthDate || "",
    nif: l.nif || "", origin: l.origin || "", follow_up_status: l.followUpStatus || ""
  }
}

export const dbToTrial = dbToLead
export const trialToDb = leadToDb

export async function sbLoadAll(table, mapper) {
  const res = await supabase.from(table).select("*")
  if (res.error) { console.error(table, res.error); return [] }
  return (res.data || []).map(mapper)
}

export async function sbUpsert(table, row) {
  const res = await supabase.from(table).upsert(row, { onConflict: "id" })
  if (res.error) console.error("upsert", table, res.error)
}

export async function sbDelete(table, id) {
  const res = await supabase.from(table).delete().eq("id", id)
  if (res.error) console.error("delete", table, res.error)
}

export async function sbDeleteAll(table) {
  const res = await supabase.from(table).delete().neq("id", "_none_")
  if (res.error) console.error("deleteAll", table, res.error)
}

export function dbToBooking(r) {
  return {
    id: r.id, clientId: r.client_id, clientName: r.client_name, clientPhone: r.client_phone,
    date: r.date, timeSlot: r.time_slot, type: r.type, status: r.status,
    notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
    reviewRequestedAt: r.review_requested_at || ''
  }
}

export function bookingToDb(b) {
  return {
    id: b.id, client_id: b.clientId || "", client_name: b.clientName,
    client_phone: b.clientPhone || "", date: b.date, time_slot: b.timeSlot,
    type: b.type || "normal", status: b.status || "confirmed",
    notes: b.notes || "", created_at: b.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}
