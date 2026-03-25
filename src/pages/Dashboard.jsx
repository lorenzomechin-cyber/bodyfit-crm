import { useMemo } from 'react'
import { T } from '../lib/i18n'
import { LCOL } from '../lib/constants'
import { daysTo, getDaysInactive, getActiveSuspension, getAdjustedEndDate, waLink, generateSlots } from '../lib/helpers'
import Icon from '../components/Icon'

const DAY_NAMES = { fr: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"], pt: ["Domingo","Segunda","Terca","Quarta","Quinta","Sexta","Sabado"], en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] }
const MONTH_NAMES = { fr: ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"], pt: ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"], en: ["January","February","March","April","May","June","July","August","September","October","November","December"] }

export default function Dashboard({ clients, leads, trials, bookings = [], lang, config, user }) {
  const t = T[lang]
  const td = new Date().toISOString().split("T")[0]
  const now = new Date()
  const thr = config && config.thresholds ? config.thresholds : { lowCredits: 3, inactiveDays: 14, expiryDays: 30 }

  const dateStr = useMemo(() => {
    const d = DAY_NAMES[lang] || DAY_NAMES.fr
    const m = MONTH_NAMES[lang] || MONTH_NAMES.fr
    return d[now.getDay()] + " " + now.getDate() + " " + m[now.getMonth()] + " " + now.getFullYear()
  }, [lang])

  const st = useMemo(() => {
    const ac = clients.filter(c => c.status === "active").length
    const ic = clients.filter(c => c.status === "inactive").length
    const sc = clients.filter(c => c.status === "suspended").length
    const tot = clients.length
    const cu = clients.filter(c => c.status === "active").reduce((s, c) => s + (c.used || 0), 0)
    const rn = clients.filter(c => { if (!c.endDate || c.status !== "active") return false; return daysTo(td, getAdjustedEndDate(c)) > 0 && daysTo(td, getAdjustedEndDate(c)) <= thr.expiryDays }).length
    const me = clients.filter(c => !c.email).length
    const lc = clients.filter(c => c.status === "active" && c.rem <= thr.lowCredits).length
    const inact = clients.filter(c => c.status === "active" && getDaysInactive(c) >= thr.inactiveDays).length
    const lT = leads.length
    const lN = leads.filter(l => l.stage === "notContacted").length
    const lB = leads.filter(l => l.stage === "sessionBooked").length
    const lD = leads.filter(l => l.stage === "sessionDone").length
    const lC = leads.filter(l => l.stage === "converted").length
    const cr = lT > 0 ? Math.round(lC / lT * 100) : 0
    return { ac, ic, sc, tot, cu, rn, me, lc, inact, lT, lN, lB, lD, lC, cr }
  }, [clients, leads, thr, td])

  const sessToday = useMemo(() => clients.reduce((n, c) => n + (c.sessions || []).filter(s => s.date === td).length, 0), [clients, td])
  const bookToday = useMemo(() => bookings.filter(b => b.date === td && (b.status === "confirmed" || b.status === "completed")).length, [bookings, td])

  const reviewsThisMonth = useMemo(() => {
    const monthStart = td.substring(0, 7) + '-01'
    return bookings.filter(b => b.reviewRequestedAt && b.reviewRequestedAt >= monthStart).length
  }, [bookings, td])

  // Section 2: Today's timeline
  const todaySlots = useMemo(() => generateSlots(td), [td])
  const todayTimeline = useMemo(() => {
    const dayBookings = bookings.filter(b => b.date === td && b.status !== "cancelled")
    return todaySlots.map(slot => {
      const slotBookings = dayBookings.filter(b => b.timeSlot === slot).sort((a, b) => (a.clientName || "").localeCompare(b.clientName || ""))
      return { slot, bookings: slotBookings }
    })
  }, [todaySlots, bookings, td])

  // Section 3: Urgent actions
  const trialsToFollow = useMemo(() => trials.filter(tr => {
    if (tr.stage === "converted" || tr.stage === "lost") return false
    if (tr.followUpStatus === "noAnswer" || tr.followUpStatus === "msgSent") {
      const lastContact = tr.lastContactDate || tr.trialDate || tr.createdAt
      if (!lastContact) return true
      return daysTo(lastContact, td) > 3
    }
    return false
  }), [trials, td])

  const expiringWeek = useMemo(() => clients.filter(c => c.status === "active" && c.endDate).map(c => { const adj = getAdjustedEndDate(c); const dl = daysTo(td, adj); return { ...c, daysLeft: dl, adjEnd: adj } }).filter(c => c.daysLeft > 0 && c.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft), [clients, td])

  const lowCredits = useMemo(() => clients.filter(c => c.status === "active" && c.sub !== "premium" && c.rem <= 3).sort((a, b) => a.rem - b.rem).slice(0, 8), [clients])

  const noShows = useMemo(() => bookings.filter(b => b.date === td && b.status === "noshow"), [bookings, td])

  const bookingAnalytics = useMemo(() => {
    if (!bookings.length) return null
    const now = new Date()

    // Last 4 weeks data
    const weeks = []
    for (let w = 0; w < 4; w++) {
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - (w * 7))
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekEnd.getDate() - 6)
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]
      const weekBookings = bookings.filter(b => b.date >= startStr && b.date <= endStr && (b.status === 'confirmed' || b.status === 'completed'))
      const noshows = bookings.filter(b => b.date >= startStr && b.date <= endStr && b.status === 'noshow')
      weeks.push({ start: startStr, end: endStr, count: weekBookings.length, noshows: noshows.length, label: 'S' + (4 - w) })
    }
    weeks.reverse()

    // Fill rate by hour (heatmap data)
    const hourCounts = {}
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
    for (let d = 1; d <= 6; d++) { // Mon-Sat
      hourCounts[d] = {}
    }
    bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').forEach(b => {
      const day = new Date(b.date + 'T12:00:00').getDay()
      if (day === 0) return
      const hour = b.timeSlot?.split(':')[0]
      if (!hour) return
      if (!hourCounts[day]) hourCounts[day] = {}
      hourCounts[day][hour] = (hourCounts[day][hour] || 0) + 1
    })

    // No-show rate
    const totalSessions = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'noshow').length
    const totalNoshows = bookings.filter(b => b.status === 'noshow').length
    const noshowRate = totalSessions > 0 ? Math.round(totalNoshows / totalSessions * 100) : 0

    // Trial conversion: count trials that have a matching phone with a normal booking later
    const trialPhones = new Set(bookings.filter(b => b.type === 'trial' && (b.status === 'completed')).map(b => b.clientPhone))
    const convertedTrials = [...trialPhones].filter(phone => bookings.some(b => b.clientPhone === phone && b.type === 'normal')).length
    const trialConversion = trialPhones.size > 0 ? Math.round(convertedTrials / trialPhones.size * 100) : 0

    // Max bar value for chart scaling
    const maxWeekCount = Math.max(...weeks.map(w => w.count), 1)

    return { weeks, hourCounts, dayNames, noshowRate, trialConversion, totalNoshows, totalSessions, maxWeekCount }
  }, [bookings])

  // Section 4 (kept): expiring 30d + funnel
  const expiring = useMemo(() => clients.filter(c => c.status === "active" && c.endDate).map(c => { const adj = getAdjustedEndDate(c); const dl = daysTo(td, adj); return { ...c, daysLeft: dl, adjEnd: adj } }).filter(c => c.daysLeft > 0 && c.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8), [clients, td])

  const stgL = { notContacted: t.notContacted, sessionBooked: t.sessionBooked, sessionDone: t.sessionDone, converted: t.converted, lost: t.lost }
  const subLD = { "12m": t.months12, "6m": t.months6, "3m": t.months3, p10: t.pack10, p15: t.pack15, p20: t.pack20, premium: t.premium }

  const urgentTotal = trialsToFollow.length + expiringWeek.length + lowCredits.length + noShows.length

  return (
    <div className="fin">
      {/* Section 1: Greeting + date + KPI cards */}
      <div className="ph">
        <h2>{t.goodMorning} {user ? user.username : ""}</h2>
        <p style={{ fontSize: 12, color: "var(--t2)", textTransform: "capitalize" }}>{dateStr}</p>
      </div>

      <div className="cg">
        {[{ l: t.sessionsToday, v: sessToday, c: "sv-ac" }, { l: t.todayBookings || "Reservations", v: bookToday, c: "sv-inf" }, { l: t.activeClients, v: st.ac, c: "sv-ok", s: st.tot + " " + t.totalClients }, { l: t.upcomingRenewals, v: st.rn, c: "sv-er" }, { l: t.lowCredits, v: st.lc, c: "sv-inf" }, { l: t.suspendedClients, v: st.sc, c: "sv-wr" }, { l: t.reviewsRequested, v: reviewsThisMonth, c: "sv-ok" }].map((x, i) =>
          <div key={i} className="cd"><div className="sl">{x.l}</div><div className={"sv " + (x.c || "")}>{x.v}</div>{x.s ? <div className="ss">{x.s}</div> : null}</div>
        )}
      </div>

      {/* Section 2: Today's sessions timeline */}
      <div className="cd" style={{ marginBottom: 16 }}>
        <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="cal" s={13} />{t.todaySessions} ({bookToday})</div>
        {todaySlots.length === 0 ? <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.closedDay}</p> :
          <div style={{ padding: "4px 0" }}>
            {todayTimeline.map(({ slot, bookings: slotBk }) => (
              <div key={slot} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--bd)", opacity: slotBk.length === 0 ? 0.4 : 1 }}>
                <div style={{ width: 42, fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: "var(--ac2)", flexShrink: 0, paddingTop: 2 }}>{slot}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {slotBk.length === 0 ? <span style={{ fontSize: 10, color: "var(--t2)", fontStyle: "italic" }}>&mdash;</span> :
                    slotBk.map(b => {
                      const reminderWa = b.clientPhone ? waLink(b.clientPhone, `Bonjour ${b.clientName || ''}, rappel de votre seance BodyFit aujourd'hui a ${b.timeSlot}. A tout a l'heure !`) : null
                      return <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: slotBk.length > 1 ? 3 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{b.clientName || "--"}</span>
                        <span className="bg" style={{ background: b.type === "trial" ? "var(--wrg)" : "var(--infg)", color: b.type === "trial" ? "var(--wr)" : "var(--inf)", fontSize: 8 }}>{b.type === "trial" ? t.sessionTrial : t.sessionNormal}</span>
                        <span className="bg" style={{ background: b.status === "completed" ? "var(--okg)" : b.status === "noshow" ? "var(--erg)" : "var(--acg)", color: b.status === "completed" ? "var(--ok)" : b.status === "noshow" ? "var(--er)" : "var(--ac2)", fontSize: 8 }}>{t["booking" + b.status.charAt(0).toUpperCase() + b.status.slice(1)] || b.status}</span>
                        {reminderWa ? <a href={reminderWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}><Icon n="wa" s={13} /></a> : null}
                      </div>
                    })
                  }
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Section 3: Urgent actions */}
      <div className="cd" style={{ marginBottom: 16 }}>
        <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="alert" s={13} />{t.urgentActions} ({urgentTotal})</div>

        {trialsToFollow.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--wr)", padding: "6px 0 2px" }}>{t.trialsToFollow} ({trialsToFollow.length})</div>
          {trialsToFollow.map(tr => {
            const dsc = tr.lastContactDate ? daysTo(tr.lastContactDate, td) : "?"
            const trWa = tr.phone ? waLink(tr.phone, `Bonjour ${tr.name || ''}, suite a votre seance d'essai chez BodyFit, souhaitez-vous programmer une nouvelle session ?`) : null
            return <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{t.daysSinceContact}: {dsc}{typeof dsc === "number" ? "j" : ""} &middot; {t[tr.followUpStatus] || tr.followUpStatus}</div></div>
              {trWa ? <a href={trWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600 }}><Icon n="wa" s={12} /></a> : null}
            </div>
          })}
        </>}

        {expiringWeek.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--er)", padding: "6px 0 2px" }}>{t.expiringThisWeek} ({expiringWeek.length})</div>
          {expiringWeek.map(c => {
            const ewWa = c.phone ? waLink(c.phone, `Bonjour ${c.name || ''}, votre abonnement BodyFit expire dans ${c.daysLeft} jour(s). Contactez-nous pour renouveler !`) : null
            return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{subLD[c.sub]} &mdash; {c.adjEnd}</div></div>
              <span className="freq-badge" style={{ background: "var(--erg)", color: "var(--er)" }}>{c.daysLeft}{t.daysLeft}</span>
              {ewWa ? <a href={ewWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}><Icon n="wa" s={12} /></a> : null}
            </div>
          })}
        </>}

        {lowCredits.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--wr)", padding: "6px 0 2px" }}>{t.lowCredits} ({lowCredits.length})</div>
          {lowCredits.map(c => {
            const lcWa = c.phone ? waLink(c.phone, `Bonjour ${c.name || ''}, il vous reste ${c.rem} credit(s) BodyFit. Pensez a renouveler votre pack !`) : null
            return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{c.rem} {t.creditsRemaining}</div></div>
              {lcWa ? <a href={lcWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}><Icon n="wa" s={12} /></a> : null}
            </div>
          })}
        </>}

        {noShows.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--er)", padding: "6px 0 2px" }}>{t.noShowsToday} ({noShows.length})</div>
          {noShows.map(b => {
            const nsWa = b.clientPhone ? waLink(b.clientPhone, `Bonjour ${b.clientName || ''}, nous avons remarque votre absence aujourd'hui chez BodyFit. Souhaitez-vous reprogrammer votre seance ?`) : null
            return <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.clientName}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{b.timeSlot} {b.type === "trial" ? `(${t.sessionTrial})` : ""}</div></div>
              {nsWa ? <a href={nsWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600 }}><Icon n="wa" s={12} />{t.noShowFollowUp}</a> : null}
            </div>
          })}
        </>}

        {urgentTotal === 0 && <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.noNoShows}</p>}
      </div>

      {/* Section 4: Funnel overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, marginBottom: 20 }}>
        <div className="cd">
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="clock" s={13} />{t.expiringClients} ({expiring.length})</div>
          {expiring.length === 0 ? <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.noExpiring}</p> :
            expiring.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{subLD[c.sub]} &mdash; {c.adjEnd}</div></div>
              <span className="freq-badge" style={{ background: c.daysLeft <= 7 ? "var(--erg)" : "var(--wrg)", color: c.daysLeft <= 7 ? "var(--er)" : "var(--wr)" }}>{c.daysLeft}{t.daysLeft}</span>
            </div>)}
        </div>

        <div className="cd"><div className="cht">{t.funnelOverview}</div><div className="fnl">
          {[{ k: "notContacted", c: "#6B6560", v: st.lN }, { k: "sessionBooked", c: "#C47F17", v: st.lB }, { k: "sessionDone", c: "#2E6DA4", v: st.lD }, { k: "converted", c: "#2D8C5A", v: st.lC }].map(item => (
            <div key={item.k} className="fns"><span className="fnl2">{t[item.k]}</span><div className="fnb" style={{ width: (st.lT > 0 ? Math.max(item.v / st.lT * 100, 8) : 8) + "%", background: item.c }}><span className="fnv">{item.v}</span></div></div>
          ))}
        </div><div style={{ textAlign: "center", marginTop: 6 }}><span style={{ fontFamily: "var(--fm)", fontSize: 18, fontWeight: 700, color: "var(--ok)" }}>{st.cr}%</span><span style={{ fontSize: 10, color: "var(--t2)", marginLeft: 5 }}>{t.conversionRate}</span></div></div>
      </div>

      {/* Booking Analytics */}
      {bookingAnalytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, marginBottom: 20 }}>

          {/* Weekly sessions chart */}
          <div className="cd">
            <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon n="activity" s={13} />Sessoes par semaine
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, marginTop: 10 }}>
              {bookingAnalytics.weeks.map((w, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--fm)", fontWeight: 700, color: "var(--t0)" }}>{w.count}</span>
                  <div style={{ width: "100%", background: "var(--ok)", borderRadius: 4, height: Math.max(4, (w.count / bookingAnalytics.maxWeekCount) * 80), transition: "height .5s ease" }} />
                  <span style={{ fontSize: 9, color: "var(--t2)" }}>{w.label}</span>
                </div>
              ))}
            </div>
            {bookingAnalytics.weeks.some(w => w.noshows > 0) && (
              <div style={{ marginTop: 8, fontSize: 10, color: "var(--t2)" }}>
                Absences: {bookingAnalytics.weeks.map(w => w.noshows).join(" · ")}
              </div>
            )}
          </div>

          {/* KPI cards */}
          <div className="cd">
            <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon n="grid" s={13} />Indicateurs cles
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: bookingAnalytics.noshowRate > 10 ? "var(--er)" : "var(--ok)" }}>{bookingAnalytics.noshowRate}%</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>Taux absence</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: bookingAnalytics.trialConversion > 50 ? "var(--ok)" : "var(--wr)" }}>{bookingAnalytics.trialConversion}%</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>Conv. essais</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: "var(--inf)" }}>{bookingAnalytics.totalSessions}</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>Total sessoes</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: "var(--er)" }}>{bookingAnalytics.totalNoshows}</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>Total absences</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
