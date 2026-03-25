import { useMemo } from 'react'
import { T } from '../lib/i18n'
import { LCOL } from '../lib/constants'
import { daysTo, getDaysInactive, getActiveSuspension, getAdjustedEndDate } from '../lib/helpers'
import Icon from '../components/Icon'

export default function Dashboard({ clients, leads, trials, bookings = [], lang, config }) {
  const t = T[lang]
  const td = new Date().toISOString().split("T")[0]
  const thr = config && config.thresholds ? config.thresholds : { lowCredits: 3, inactiveDays: 14, expiryDays: 30 }

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

  const expiring = useMemo(() => clients.filter(c => c.status === "active" && c.endDate).map(c => { const adj = getAdjustedEndDate(c); const dl = daysTo(td, adj); return { ...c, daysLeft: dl, adjEnd: adj } }).filter(c => c.daysLeft > 0 && c.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8), [clients, td])

  const inactive14 = useMemo(() => clients.filter(c => c.status === "active" && !getActiveSuspension(c)).map(c => ({ ...c, daysInact: getDaysInactive(c) })).filter(c => c.daysInact >= 14).sort((a, b) => b.daysInact - a.daysInact).slice(0, 8), [clients])

  const latestLeads = useMemo(() => [...leads].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 6), [leads])

  const stgL = { notContacted: t.notContacted, sessionBooked: t.sessionBooked, sessionDone: t.sessionDone, converted: t.converted, lost: t.lost }
  const subLD = { "12m": t.months12, "6m": t.months6, "3m": t.months3, p10: t.pack10, p15: t.pack15, p20: t.pack20, premium: t.premium }

  return (
    <div className="fin">
      <div className="ph"><h2>{t.dashboard}</h2><p>{t.overview} &mdash; {st.tot} {t.totalClients} &middot; {st.lT} {t.totalLeads}</p></div>

      <div className="cg">
        {[{ l: t.activeClients, v: st.ac, c: "sv-ok", s: st.tot + " " + t.totalClients }, { l: t.suspendedClients, v: st.sc, c: "sv-wr" }, { l: t.sessionsToday, v: sessToday, c: "sv-ac" }, { l: t.todayBookings || "Reservations", v: bookToday, c: "sv-inf" }, { l: t.upcomingRenewals, v: st.rn, c: "sv-er" }, { l: t.lowCredits, v: st.lc, c: "sv-inf" }].map((x, i) =>
          <div key={i} className="cd"><div className="sl">{x.l}</div><div className={"sv " + (x.c || "")}>{x.v}</div>{x.s ? <div className="ss">{x.s}</div> : null}</div>
        )}
      </div>

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

        <div className="cd">
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="pause" s={13} />{t.inactiveClients14} ({inactive14.length})</div>
          {inactive14.length === 0 ? <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.noInactive}</p> :
            inactive14.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{c.phone}</div></div>
              <span className="freq-badge" style={{ background: "var(--erg)", color: "var(--er)" }}>{c.daysInact}j</span>
            </div>)}
        </div>

        <div className="cd">
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="zap" s={13} />{t.latestLeads} ({leads.length})</div>
          {latestLeads.length === 0 ? <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.noLeadsYet}</p> :
            latestLeads.map(l => <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: LCOL[l.stage], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{l.phone || l.email}</div></div>
              <span className="bg" style={{ background: LCOL[l.stage] + "14", color: LCOL[l.stage], fontSize: 8 }}>{stgL[l.stage]}</span>
            </div>)}
        </div>

        <div className="cd"><div className="cht">{t.funnelOverview}</div><div className="fnl">
          {[{ k: "notContacted", c: "#6B6560", v: st.lN }, { k: "sessionBooked", c: "#C47F17", v: st.lB }, { k: "sessionDone", c: "#2E6DA4", v: st.lD }, { k: "converted", c: "#2D8C5A", v: st.lC }].map(item => (
            <div key={item.k} className="fns"><span className="fnl2">{t[item.k]}</span><div className="fnb" style={{ width: (st.lT > 0 ? Math.max(item.v / st.lT * 100, 8) : 8) + "%", background: item.c }}><span className="fnv">{item.v}</span></div></div>
          ))}
        </div><div style={{ textAlign: "center", marginTop: 6 }}><span style={{ fontFamily: "var(--fm)", fontSize: 18, fontWeight: 700, color: "var(--ok)" }}>{st.cr}%</span><span style={{ fontSize: 10, color: "var(--t2)", marginLeft: 5 }}>{t.conversionRate}</span></div></div>

      </div>
    </div>
  )
}
