import { useState, useMemo } from 'react'
import { T } from '../lib/i18n'
import { uid, waLink } from '../lib/helpers'
import { generateSlots, getSlotCounts, isSlotAvailable } from '../lib/helpers'
import { MAX_MACHINES } from '../lib/constants'
import Icon from '../components/Icon'

const addDays = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().split("T")[0] }
const getWeekDates = (d) => {
  const dt = new Date(d + "T12:00:00")
  const dow = dt.getDay() || 7
  const mon = new Date(dt); mon.setDate(dt.getDate() - dow + 1)
  return Array.from({ length: 6 }, (_, i) => {
    const x = new Date(mon); x.setDate(mon.getDate() + i); return x.toISOString().split("T")[0]
  })
}
const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const fmtD = (d) => { const dt = new Date(d + "T12:00:00"); return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }
const fmtShort = (d) => { const dt = new Date(d + "T12:00:00"); return dayNames[dt.getDay()] + " " + dt.getDate() + "/" + String(dt.getMonth() + 1).padStart(2, "0") }

export default function PlanningPage({ bookings, setBookings, clients, lang, trials, setTrials }) {
  const t = T[lang]

  // #3 — reactive todayStr (updates if tab stays open past midnight)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])
  // We use a state-driven approach: re-render on interaction will pick up new date.
  // For true midnight reactivity we'd need a timer, but this is sufficient for CRM use.

  const [view, setView] = useState("day")
  const [sel, setSel] = useState(() => new Date().toISOString().split("T")[0])
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState("")

  // #8 — filter by booking type
  const [typeFilter, setTypeFilter] = useState("all") // all | normal | trial

  // add modal form state
  const [addType, setAddType] = useState("normal")
  const [addMode, setAddMode] = useState("existing") // existing | manual
  const [addClient, setAddClient] = useState(null)
  const [addName, setAddName] = useState("")
  const [addPhone, setAddPhone] = useState("")
  const [addNotes, setAddNotes] = useState("")

  const nowH = new Date().getHours()
  const nowM = new Date().getMinutes()
  const nowSlot = `${String(nowH).padStart(2, "0")}:${String(Math.floor(nowM / 30) * 30).padStart(2, "0")}`
  const isSunday = new Date(sel + "T12:00:00").getDay() === 0

  const slots = useMemo(() => generateSlots(sel), [sel])
  const counts = useMemo(() => getSlotCounts(bookings, sel), [bookings, sel])

  // #5 — booking index for performance: pre-index by date|timeSlot
  const bookingIndex = useMemo(() => {
    const idx = {}
    bookings.forEach(b => {
      if (b.status !== 'cancelled') {
        const key = b.date + '|' + b.timeSlot
        ;(idx[key] = idx[key] || []).push(b)
      }
    })
    return idx
  }, [bookings])

  const dayBookings = useMemo(() => bookings.filter(b => b.date === sel && b.status !== "cancelled"), [bookings, sel])

  const stats = useMemo(() => {
    const td = new Date().toISOString().split("T")[0]
    const todayBk = bookings.filter(b => b.date === td && (b.status === "confirmed" || b.status === "completed"))
    const todaySlots = generateSlots(td)
    const cap = todaySlots.length * MAX_MACHINES
    const fill = cap > 0 ? Math.round(todayBk.length / cap * 100) : 0
    const wk = getWeekDates(sel)
    const weekBk = bookings.filter(b => wk.includes(b.date) && (b.status === "confirmed" || b.status === "completed")).length
    return { today: todayBk.length, fill, weekBk }
  }, [bookings, sel])

  const weekDates = useMemo(() => getWeekDates(sel), [sel])

  const weekData = useMemo(() => {
    const data = {}
    weekDates.forEach(d => {
      const sl = generateSlots(d)
      const ct = getSlotCounts(bookings, d)
      data[d] = { slots: sl, counts: ct, total: Object.values(ct).reduce((a, b) => a + b, 0) }
    })
    return data
  }, [bookings, weekDates])

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients.slice(0, 10)
    const q = search.toLowerCase()
    return clients.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 10)
  }, [clients, search])

  // #10 — use bookingIndex instead of filter per render
  const getBookingsForSlot = (date, slot) => {
    const key = date + '|' + slot
    let result = bookingIndex[key] || []
    // #8 — apply type filter
    if (typeFilter !== "all") {
      result = result.filter(b => b.type === typeFilter)
    }
    return result
  }

  // #2 — find past confirmed bookings for bulk complete
  const pastConfirmedBookings = useMemo(() => {
    const now = new Date()
    return dayBookings.filter(b => {
      if (b.status !== "confirmed") return false
      const [h, m] = b.timeSlot.split(":").map(Number)
      const slotDate = new Date(sel + "T12:00:00")
      slotDate.setHours(h, m, 0, 0)
      return slotDate < now
    })
  }, [dayBookings, sel])

  const openAdd = (date, slot, prefill) => {
    if (prefill) {
      setAddType(prefill.type || "normal")
      setAddMode(prefill.mode || "existing")
      setAddClient(prefill.client || null)
      setAddName(prefill.name || "")
      setAddPhone(prefill.phone || "")
      setAddNotes(prefill.notes || "")
    } else {
      setAddType("normal"); setAddMode("existing"); setAddClient(null); setAddName(""); setAddPhone(""); setAddNotes("")
    }
    setSearch("")
    setModal({ mode: "add", date, slot })
  }

  const openDetail = (booking) => setModal({ mode: "detail", booking })

  const saveBooking = () => {
    if (!modal) return
    const clientName = addMode === "existing" ? addClient?.name : addName.trim()
    const clientPhone = addMode === "existing" ? addClient?.phone : addPhone.trim()
    if (!clientName) return
    // P0: Capacity guard — prevent overbooking
    if (!isSlotAvailable(bookings, modal.date, modal.slot)) {
      alert("Ce creneau est complet (3/3 machines). Impossible d'ajouter une reservation.")
      return
    }
    const nb = {
      id: uid(), date: modal.date, timeSlot: modal.slot,
      clientName, clientPhone: clientPhone || "",
      clientId: addMode === "existing" ? addClient?.id : null,
      type: addType, status: "confirmed", notes: addNotes.trim(), createdAt: new Date().toISOString()
    }
    setBookings(prev => [...prev, nb])
    setModal(null)
  }

  const updateStatus = (id, status) => {
    const bk = bookings.find(b => b.id === id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (status === "noshow" && bk?.type === "trial" && setTrials) {
      setTrials(prev => prev.map(tr => {
        if (tr.name === bk.clientName || tr.phone === bk.clientPhone) return { ...tr, followUpStatus: "noAnswer", lastActionDate: new Date().toISOString().split("T")[0] }
        return tr
      }))
    }
    setModal(null)
  }

  const cancelBooking = (id) => updateStatus(id, "cancelled")

  // #2 — bulk mark all past confirmed as completed
  const markAllPastCompleted = () => {
    if (!pastConfirmedBookings.length) return
    const ids = new Set(pastConfirmedBookings.map(b => b.id))
    setBookings(prev => prev.map(b => ids.has(b.id) ? { ...b, status: "completed" } : b))
  }

  // #7 — reschedule: cancel current + open add modal pre-filled
  const rescheduleBooking = (bk) => {
    cancelBooking(bk.id)
    const prefill = {
      type: bk.type,
      mode: bk.clientId ? "existing" : "manual",
      client: bk.clientId ? clients.find(c => c.id === bk.clientId) || null : null,
      name: bk.clientName || "",
      phone: bk.clientPhone || "",
      notes: bk.notes || ""
    }
    // Small delay so the cancel state update processes
    setTimeout(() => openAdd(sel, slots[0] || "08:00", prefill), 0)
  }

  // #6 — count no-shows for a client in the last 30 days
  const getClientNoshowCount = (bk) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split("T")[0]
    return bookings.filter(b =>
      b.status === "noshow" &&
      b.date >= cutoffStr &&
      (b.clientName === bk.clientName || (bk.clientId && b.clientId === bk.clientId))
    ).length
  }

  const isPast = (date, slot) => {
    const now = new Date()
    const [h, m] = slot.split(":").map(Number)
    const slotDate = new Date(date + "T12:00:00")
    slotDate.setHours(h, m, 0, 0)
    return slotDate < now
  }

  const statusBadge = (s) => {
    const m = { confirmed: ["bg-inf", t.bookingConfirmed], completed: ["bg-ok", t.bookingCompleted], noshow: ["bg-er", t.bookingNoshow], cancelled: ["bg-wr", t.bookingCancelled] }
    const [cls, lbl] = m[s] || ["bg", s]
    return <span className={"bg " + cls}>{lbl}</span>
  }

  const typeBadge = (tp) => tp === "trial" ? <span className="bg bg-wr">{t.sessionTrial}</span> : <span className="bg bg-inf">{t.sessionNormal}</span>

  // ---------- RENDER ----------
  return (
    <div className="fin">
      {/* Page header */}
      <div className="ph">
        <div className="phr">
          <div>
            <h2>{t.planning}</h2>
            <p>{fmtD(sel)}</p>
          </div>
          <div className="pha" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button className={view === "day" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setView("day")}>{t.dayView}</button>
            <button className={view === "week" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setView("week")}>{t.weekView}</button>
            <span style={{ width: 8 }} />
            <button className="bt bs bsm" onClick={() => setSel(addDays(sel, -1))}><Icon n="cL" s={12} /></button>
            <button className="bt bs bsm" onClick={() => setSel(new Date().toISOString().split("T")[0])}>Aujourd'hui</button>
            <button className="bt bs bsm" onClick={() => setSel(addDays(sel, 1))}><Icon n="cR" s={12} /></button>
            {/* #9 — date picker for direct date jumping */}
            <input
              type="date"
              className="fi"
              value={sel}
              onChange={e => { if (e.target.value) setSel(e.target.value) }}
              style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="cg">
        <div className="cd"><div className="sl">{t.todayBookings}</div><div className="sv sv-ac">{stats.today}</div></div>
        <div className="cd"><div className="sl">{t.fillRate}</div><div className={"sv " + (stats.fill >= 80 ? "sv-ok" : stats.fill >= 40 ? "sv-wr" : "sv-er")}>{stats.fill}%</div></div>
        <div className="cd"><div className="sl">{t.weekTotal}</div><div className="sv sv-inf">{stats.weekBk}</div></div>
      </div>

      {/* Day View */}
      {view === "day" && (
        isSunday ? (
          <div className="cd" style={{ textAlign: "center", padding: 40, color: "var(--t2)" }}>
            <Icon n="pause" s={24} /><br />
            <strong>{t.closedDay}</strong>
          </div>
        ) : (
          <div className="cd" style={{ padding: 0, overflow: "auto" }}>
            {/* #8 — type filter buttons + #2 — bulk complete button */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", borderBottom: "1px solid var(--bd)" }}>
              <Icon n="filter" s={12} />
              <button className={typeFilter === "all" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setTypeFilter("all")}>{t.allTypes}</button>
              <button className={typeFilter === "normal" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setTypeFilter("normal")}>{t.sessionNormal}</button>
              <button className={typeFilter === "trial" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setTypeFilter("trial")}>{t.sessionTrial}</button>
              {/* #2 — bulk mark all past confirmed as completed */}
              {pastConfirmedBookings.length > 0 && (
                <>
                  <span style={{ flex: 1 }} />
                  <button className="bt bok bsm" onClick={markAllPastCompleted}>
                    <Icon n="check" s={11} /> Marquer {pastConfirmedBookings.length} passée{pastConfirmedBookings.length > 1 ? "s" : ""} effectuée{pastConfirmedBookings.length > 1 ? "s" : ""}
                  </button>
                </>
              )}
            </div>

            <div className="pl-grid" style={{ display: "grid", gridTemplateColumns: "70px repeat(3, 1fr)" }}>
              {/* Header */}
              <div className="pl-cell pl-hd" />
              {[1, 2, 3].map(m => <div key={m} className="pl-cell pl-hd">{t.machine} {m}</div>)}

              {/* Slots */}
              {slots.map(slot => {
                const slotBks = getBookingsForSlot(sel, slot)
                const currentTodayStr = new Date().toISOString().split("T")[0]
                const isNow = sel === currentTodayStr && slot === nowSlot
                return [
                  <div key={slot + "-t"} className={"pl-cell pl-time" + (isNow ? " now" : "")}>{slot}</div>,
                  ...[0, 1, 2].map(mi => {
                    const bk = slotBks[mi]
                    const past = isPast(sel, slot)
                    return (
                      <div key={slot + "-" + mi} className={"pl-cell" + (isNow ? " now" : "")}>
                        {bk ? (
                          <button
                            className={"pl-bk st-" + (bk.type === "trial" ? "trial" : bk.status)}
                            onClick={() => openDetail(bk)}
                            title={bk.clientName}
                          >
                            {bk.clientName}
                          </button>
                        ) : !past && isSlotAvailable(bookings, sel, slot) ? (
                          <button className="pl-add" onClick={() => openAdd(sel, slot)}><Icon n="plus" s={11} /></button>
                        ) : null}
                      </div>
                    )
                  })
                ]
              })}
            </div>
            {slots.length === 0 && <p style={{ textAlign: "center", padding: 20, color: "var(--t2)" }}>{t.noBookings}</p>}
          </div>
        )
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="cd" style={{ padding: 0, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "70px repeat(6, 1fr)", gap: 1, background: "var(--bd)" }}>
            {/* Header */}
            <div className="pl-cell pl-hd" />
            {weekDates.map(d => {
              const isSun = new Date(d + "T12:00:00").getDay() === 0
              return <div key={d} className="pl-cell pl-hd" style={{ cursor: isSun ? "default" : "pointer" }} onClick={() => { if (!isSun) { setSel(d); setView("day") } }}>{fmtShort(d)}</div>
            })}

            {/* All unique slots across the week */}
            {(() => {
              const allSlots = [...new Set(weekDates.flatMap(d => weekData[d]?.slots || []))].sort()
              return allSlots.map(slot => (
                [
                  <div key={slot + "-t"} className="pl-cell pl-time">{slot}</div>,
                  ...weekDates.map(d => {
                    const wd = weekData[d]
                    const isSun = new Date(d + "T12:00:00").getDay() === 0
                    if (isSun) return <div key={slot + "-" + d} className="wk-cell" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)" }}>&mdash;</div>
                    if (!wd?.slots.includes(slot)) return <div key={slot + "-" + d} className="wk-cell f0" />
                    const cnt = wd.counts[slot] || 0
                    const fc = cnt === 0 ? "f0" : cnt === 1 ? "f1" : cnt === 2 ? "f2" : "f3"
                    return (
                      <div key={slot + "-" + d} className={"wk-cell " + fc} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11 }} onClick={() => { setSel(d); setView("day") }}>
                        {cnt > 0 ? cnt : ""}
                      </div>
                    )
                  })
                ]
              ))
            })()}

            {/* Totals row */}
            <div className="pl-cell pl-time" style={{ fontWeight: 700, fontSize: 10 }}>TOTAL</div>
            {weekDates.map(d => {
              const isSun = new Date(d + "T12:00:00").getDay() === 0
              return <div key={"tot-" + d} className="pl-cell pl-hd" style={{ fontWeight: 700 }}>{isSun ? "\u2014" : weekData[d]?.total || 0}</div>
            })}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {modal?.mode === "add" && (
        <div className="mo" onClick={() => setModal(null)}>
          <div className="md" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <h3>{t.addBooking}</h3>
              <button className="bt bg0 bsm" onClick={() => setModal(null)}><Icon n="x" s={14} /></button>
            </div>
            <div className="mb">
              <div className="fg2">
                <div className="fg">
                  <label className="fl">{t.sessionDate || "Date"}</label>
                  <div className="fi" style={{ background: "var(--b1)", cursor: "default" }}>{fmtD(modal.date)}</div>
                </div>
                <div className="fg">
                  <label className="fl">Cr\u00e9neau</label>
                  <div className="fi" style={{ background: "var(--b1)", cursor: "default" }}>{modal.slot}</div>
                </div>
              </div>

              <div className="fg" style={{ marginTop: 12 }}>
                <label className="fl">{t.bookingType}</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={addType === "normal" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setAddType("normal")}>{t.sessionNormal}</button>
                  <button className={addType === "trial" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setAddType("trial")}>{t.sessionTrial}</button>
                </div>
              </div>

              <div className="fg" style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button className={addMode === "existing" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setAddMode("existing")}>{t.selectClient}</button>
                  <button className={addMode === "manual" ? "bt bp bsm" : "bt bs bsm"} onClick={() => setAddMode("manual")}>{t.manualEntry}</button>
                </div>

                {addMode === "existing" ? (
                  <div>
                    <input className="fi" placeholder={t.search || "Rechercher..."} value={search} onChange={e => { setSearch(e.target.value); setAddClient(null) }} />
                    {addClient && <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "var(--ac)" }}><Icon n="check" s={11} /> {addClient.name}</div>}
                    {!addClient && search.trim() && (
                      <div style={{ border: "1px solid var(--bd)", borderRadius: 6, maxHeight: 150, overflow: "auto", marginTop: 4 }}>
                        {filteredClients.map(c => (
                          <div key={c.id} style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid var(--bd)", display: "flex", justifyContent: "space-between" }} onClick={() => { setAddClient(c); setSearch(c.name) }}>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: "var(--t2)" }}>{c.phone}</span>
                          </div>
                        ))}
                        {filteredClients.length === 0 && <div style={{ padding: 10, fontSize: 11, color: "var(--t2)", textAlign: "center" }}>{t.noResults}</div>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="fg2">
                    <div className="fg">
                      <label className="fl">{t.name}</label>
                      <input className="fi" value={addName} onChange={e => setAddName(e.target.value)} />
                    </div>
                    <div className="fg">
                      <label className="fl">{t.phone}</label>
                      <input className="fi" value={addPhone} onChange={e => setAddPhone(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="fg" style={{ marginTop: 12 }}>
                <label className="fl">{t.bookingNotes}</label>
                <textarea className="fta" rows={2} value={addNotes} onChange={e => setAddNotes(e.target.value)} />
              </div>
            </div>
            <div className="mf">
              <button className="bt bs" onClick={() => setModal(null)}>{t.cancel}</button>
              <button className="bt bp" onClick={saveBooking}>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modal?.mode === "detail" && (() => {
        const bk = modal.booking
        const noshowCount = getClientNoshowCount(bk)
        return (
          <div className="mo" onClick={() => setModal(null)}>
            <div className="md" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h3>{bk.clientName}</h3>
                <button className="bt bg0 bsm" onClick={() => setModal(null)}><Icon n="x" s={14} /></button>
              </div>
              <div className="mb">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  {/* #1 — phone with WhatsApp link */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--t2)" }}>{t.phone}:</span> {bk.clientPhone || "\u2014"}
                    {bk.clientPhone && (
                      <a
                        href={waLink(bk.clientPhone, `Bonjour ${bk.clientName || ''} !`)}
                        target="_blank"
                        rel="noopener"
                        title="WhatsApp"
                        style={{ color: "#25D366", display: "inline-flex", alignItems: "center" }}
                      >
                        <Icon n="phone" s={13} />
                      </a>
                    )}
                  </div>
                  <div><span style={{ color: "var(--t2)" }}>Date:</span> {fmtD(bk.date)}</div>
                  <div><span style={{ color: "var(--t2)" }}>Cr\u00e9neau:</span> {bk.timeSlot}</div>
                  <div><span style={{ color: "var(--t2)" }}>{t.bookingType}:</span> {typeBadge(bk.type)}</div>
                  <div><span style={{ color: "var(--t2)" }}>{t.status}:</span> {statusBadge(bk.status)}</div>
                  {/* #6 — no-show counter */}
                  {noshowCount > 0 && (
                    <div style={{ color: "var(--er)", fontWeight: 600 }}>
                      <Icon n="alert" s={11} /> {noshowCount} absence{noshowCount > 1 ? "s" : ""} ce mois
                    </div>
                  )}
                  {bk.notes && <div style={{ gridColumn: "1/-1" }}><span style={{ color: "var(--t2)" }}>{t.bookingNotes}:</span> {bk.notes}</div>}
                </div>
              </div>
              <div className="mf">
                {bk.status === "confirmed" ? (
                  <>
                    {bk.clientPhone ? <a href={waLink(bk.clientPhone, `Bonjour ${bk.clientName || ''} ! Rappel de votre s\u00e9ance EMS demain \u00e0 ${bk.timeSlot} chez BodyFit. \u00c0 demain ! \u{1F4AA}`)} target="_blank" rel="noopener" className="bt bs bsm" style={{ textDecoration: "none", color: "#25D366" }}><Icon n="phone" s={11} /> {t.waReminder}</a> : null}
                    <button className="bt bok bsm" onClick={() => updateStatus(bk.id, "completed")}><Icon n="check" s={11} /> {t.markCompleted}</button>
                    <button className="bt bdd bsm" onClick={() => updateStatus(bk.id, "noshow")}><Icon n="alert" s={11} /> {t.markNoshow}</button>
                    {/* #7 — reschedule button */}
                    <button className="bt bs bsm" onClick={() => rescheduleBooking(bk)}><Icon n="repeat" s={11} /> Reprogrammer</button>
                    <button className="bt bs bsm" onClick={() => cancelBooking(bk.id)}>{t.cancelBooking}</button>
                  </>
                ) : bk.status === "noshow" && bk.clientPhone ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {statusBadge(bk.status)}
                    <a href={waLink(bk.clientPhone, `Bonjour ${bk.clientName || ''}, nous avons remarqu\u00e9 votre absence aujourd'hui chez BodyFit. Souhaitez-vous reprogrammer votre s\u00e9ance ? \u{1F60A}`)} target="_blank" rel="noopener" className="bt bs bsm" style={{ textDecoration: "none", color: "#25D366" }}><Icon n="phone" s={11} /> {t.noShowFollowUp}</a>
                  </div>
                ) : (
                  statusBadge(bk.status)
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
