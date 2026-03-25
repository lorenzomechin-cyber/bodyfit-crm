import { useState } from 'react'
import { T } from '../lib/i18n'
import { SUB, STATUSES } from '../lib/constants'
import { uid, daysTo, fmtDate, calcAge, getLastSession, getDaysInactive, getFrequency, getActiveSuspension, getLastPaymentMonth, getAdjustedEndDate } from '../lib/helpers'
import Icon from './Icon'

export default function CDetail({ client: c, onClose, onUpdate, lang }) {
  const t = T[lang]
  const [tab, sTab] = useState("info")
  const [suspForm, setSuspForm] = useState({ from: "", to: "", reason: "" })
  const [renForm, setRenForm] = useState({ date: new Date().toISOString().split("T")[0], type: "12m", status: "renewed" })

  if (!c) return null

  const subLabels = { "12m": t.months12, "6m": t.months6, "3m": t.months3, p10: t.pack10, p15: t.pack15, p20: t.pack20, premium: t.premium }
  const srcOptions = [["recommendation", t.recommendation], ["socialMedia", t.socialMedia], ["internetSearch", t.internetSearch], ["studio", t.studio], ["advertising", t.advertising], ["oldClient", t.oldClient]]
  const totalCr = (c.credits || 0) + (c.bonus || 0)
  const usedPct = totalCr > 0 ? Math.min((c.used / totalCr) * 100, 100) : 0
  const barColor = usedPct > 90 ? "var(--er)" : usedPct > 70 ? "var(--wr)" : "var(--ok)"
  const clientAge = calcAge(c.birthDate)
  const lastSess = getLastSession(c)
  const daysInact = getDaysInactive(c)
  const freqVal = getFrequency(c)
  const activeSusp = getActiveSuspension(c)
  const adjustedEnd = getAdjustedEndDate(c)
  const lpInfo = getLastPaymentMonth(c)

  function up(field, value) { onUpdate({ ...c, [field]: value }) }

  function doAddSession() {
    const td = new Date().toISOString().split("T")[0]
    onUpdate({ ...c, sessions: (c.sessions || []).concat([{ id: uid(), date: td }]), used: (c.used || 0) + 1, rem: Math.max((c.rem || 0) - 1, 0) })
  }

  function doDeleteSession(sid) {
    onUpdate({ ...c, sessions: (c.sessions || []).filter(s => s.id !== sid), used: Math.max((c.used || 0) - 1, 0), rem: (c.rem || 0) + 1 })
  }

  function doAddSuspension() {
    if (!suspForm.from) return
    const days = suspForm.to ? daysTo(suspForm.from, suspForm.to) : 0
    onUpdate({ ...c, status: "suspended", suspensionHistory: (c.suspensionHistory || []).concat([{ id: uid(), from: suspForm.from, to: suspForm.to, reason: suspForm.reason, daysAdded: days }]) })
    setSuspForm({ from: "", to: "", reason: "" })
  }

  function doAddRenewal() {
    if (!renForm.date) return
    const ns = SUB[renForm.type]
    const cr = ns.cr
    const newStart = renForm.date
    let newEnd = ""
    if (ns.mo) { const d = new Date(newStart); d.setMonth(d.getMonth() + ns.mo); newEnd = d.toISOString().split("T")[0] }
    onUpdate({ ...c, sub: renForm.type, credits: cr, used: 0, rem: cr, bonus: 0, startDate: newStart, endDate: newEnd, status: "active", renewalHistory: (c.renewalHistory || []).concat([{ id: uid(), date: renForm.date, type: renForm.type, status: renForm.status }]) })
    setRenForm({ date: new Date().toISOString().split("T")[0], type: "12m", status: "renewed" })
  }

  function doChangeSub(ns) {
    const s = SUB[ns]
    if (s) { onUpdate({ ...c, sub: ns, credits: s.cr, rem: s.cr - (c.used || 0) + (c.bonus || 0) }) } else { up("sub", ns) }
  }

  const timelineItems = []
  if (c.sessions) { c.sessions.forEach(s => { timelineItems.push({ id: s.id, date: s.date, type: "session", icon: "zap", bg: "var(--infg)", fg: "var(--inf)", text: t.timelineSession, canDel: true }) }) }
  if (c.suspensionHistory) { c.suspensionHistory.forEach(s => { timelineItems.push({ id: s.id, date: s.from, type: "suspension", icon: "pause", bg: "var(--wrg)", fg: "var(--wr)", text: t.timelineSuspension + ": " + (s.reason || "--"), canDel: false }) }) }
  if (c.renewalHistory) { c.renewalHistory.forEach(r => { timelineItems.push({ id: r.id, date: r.date, type: "renewal", icon: "repeat", bg: "var(--okg)", fg: "var(--ok)", text: t.timelineRenewal + " " + (subLabels[r.type] || r.type), canDel: false }) }) }
  if (c.startDate) { timelineItems.push({ id: "reg", date: c.startDate, type: "created", icon: "user", bg: "var(--acg)", fg: "var(--ac)", text: t.timelineCreated, canDel: false }) }
  timelineItems.sort((a, b) => b.date.localeCompare(a.date))

  const tabDefs = [{ k: "info", l: t.personalInfo, i: "user" }, { k: "history", l: t.timeline, i: "activity" }, { k: "renewals", l: t.renewals, i: "repeat" }]

  return (
    <div className="dp">
      <div className="dph">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{c.name || "--"}</h3>
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
            <span className={"bg bg-" + c.status}>{t[c.status]}</span>
            {clientAge ? <span className="bg bg-inf">{clientAge} {t.years}</span> : null}
            {c.sub ? <span className="bg bg-ok" style={{ fontSize: 8 }}>{subLabels[c.sub]}</span> : null}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {freqVal > 0 ? <span className="freq-badge" style={{ background: freqVal >= 3 ? "var(--okg)" : freqVal >= 1.5 ? "var(--wrg)" : "var(--erg)", color: freqVal >= 3 ? "var(--ok)" : freqVal >= 1.5 ? "var(--wr)" : "var(--er)" }}><Icon n="activity" s={9} />{freqVal} {t.sessionsPerMonth}</span> : null}
            {lastSess ? <span className="freq-badge" style={{ background: daysInact > 14 ? "var(--erg)" : "var(--infg)", color: daysInact > 14 ? "var(--er)" : "var(--inf)" }}><Icon n="clock" s={9} />{daysInact}j</span> : null}
          </div>
        </div>
        <button className="bg0" onClick={onClose}><Icon n="x" s={15} /></button>
      </div>

      {activeSusp ? <div className="susp-bar"><Icon n="pause" s={14} /><div style={{ flex: 1 }}><p style={{ fontSize: 11, fontWeight: 600, color: "var(--wr)" }}>{t.suspendActive}</p><span style={{ fontSize: 9, color: "var(--t2)" }}>{activeSusp.from} - {activeSusp.to || "?"} - {activeSusp.reason}</span></div></div> : null}

      <div style={{ display: "flex", borderBottom: "1px solid var(--bd)" }}>
        {tabDefs.map(tb => (
          <button key={tb.k} style={{ flex: 1, padding: "8px 4px", background: tab === tb.k ? "var(--acg)" : "none", border: "none", borderBottom: tab === tb.k ? "2px solid var(--ac)" : "2px solid transparent", color: tab === tb.k ? "var(--ac2)" : "var(--t2)", fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontFamily: "var(--f)" }} onClick={() => sTab(tb.k)}><Icon n={tb.i} s={12} />{tb.l}</button>
        ))}
      </div>

      {tab === "info" ? <div>
        <div className="dps"><div className="dst">{t.contactInfo}</div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.name}</label><input className="fi" value={c.name || ""} onChange={e => up("name", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.phone}</label><div style={{ display: "flex", gap: 4 }}><input className="fi" style={{ flex: 1 }} value={c.phone || ""} onChange={e => up("phone", e.target.value)} />{c.phone ? <a href={"tel:" + c.phone} className="bt bs bsm" style={{ textDecoration: "none" }}><Icon n="phone" s={11} /></a> : null}</div></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.email}</label><div style={{ display: "flex", gap: 4 }}><input className="fi" style={{ flex: 1 }} value={c.email || ""} onChange={e => up("email", e.target.value)} />{c.email ? <a href={"mailto:" + c.email} className="bt bs bsm" style={{ textDecoration: "none" }}><Icon n="mail" s={11} /></a> : null}</div></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.birthDate}</label><input className="fi" type="date" value={c.birthDate || ""} onChange={e => up("birthDate", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.gender}</label><select className="fsl" value={c.gender || ""} onChange={e => up("gender", e.target.value)}><option value="male">{t.male}</option><option value="female">{t.female}</option></select></div>
          <div className="fg"><label className="fl">{t.source}</label><select className="fsl" value={c.source || ""} onChange={e => up("source", e.target.value)}><option value="">--</option>{srcOptions.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></div>
        </div>
        <div className="dps"><div className="dst">{t.subscriptionInfo}</div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.status}</label><select className="fsl" value={c.status || ""} onChange={e => up("status", e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{t[s]}</option>)}</select></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.subscriptionType}</label><select className="fsl" value={c.sub || ""} onChange={e => doChangeSub(e.target.value)}>{Object.keys(SUB).map(k => <option key={k} value={k}>{subLabels[k]}</option>)}</select></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.startDate}</label><input className="fi" type="date" value={c.startDate || ""} onChange={e => up("startDate", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.endDate}</label><input className="fi" type="date" value={c.endDate || ""} onChange={e => up("endDate", e.target.value)} /></div>
          {adjustedEnd !== c.endDate ? <div className="dr"><span className="drl">{t.endDateAdjusted}</span><span className="drv" style={{ color: "var(--wr)" }}>{adjustedEnd}</span></div> : null}
          {lpInfo ? <div className="dr"><span className="drl">{t.lastPayment}</span><span className="drv" style={{ fontWeight: lpInfo.isThisMonth ? 700 : 400, color: lpInfo.isThisMonth ? "var(--er)" : lpInfo.isNextMonth ? "var(--wr)" : "var(--t0)" }}>{lpInfo.label}{lpInfo.isThisMonth ? " !" : ""}{lpInfo.monthsLeft > 0 ? " (" + lpInfo.monthsLeft + " mois)" : ""}</span></div> : null}
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.nif}</label><input className="fi" value={c.nif || ""} onChange={e => up("nif", e.target.value)} /></div>
          <div style={{ marginTop: 6 }}>{c.sub === "premium" ? <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ok)", textAlign: "center" }}>Premium</div> : <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}><span style={{ color: "var(--t2)" }}>{c.used} {t.creditsUsed}</span><span style={{ fontFamily: "var(--fm)", fontWeight: 700, color: barColor }}>{c.rem} {t.creditsRemaining}</span></div><div className="crb"><div className="crb-f" style={{ width: usedPct + "%", background: barColor }} /></div>{c.bonus > 0 ? <div style={{ fontSize: 9, color: "var(--ac2)", marginTop: 2 }}>+{c.bonus} {t.bonus}</div> : null}</div>}</div>
        </div>
        <div className="dps"><div className="dst">{t.notes}</div><textarea className="fta" value={c.notes || ""} onChange={e => up("notes", e.target.value)} /></div>
        <div className="dps"><div className="dst"><Icon n="heart" s={10} /> {t.medicalInfo}</div>
          <div className="fg" style={{ marginBottom: 6 }}><label className="fl">{t.contraindications}</label><input className="fi" value={c.contraindications || ""} onChange={e => up("contraindications", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.medicalNotes}</label><textarea className="fta" style={{ minHeight: 36 }} value={c.medicalNotes || ""} onChange={e => up("medicalNotes", e.target.value)} /></div>
        </div>
        {c.suspensionHistory && c.suspensionHistory.length > 0 ? <div className="dps"><div className="dst">{t.suspensions}</div>{c.suspensionHistory.map(s => <div key={s.id} style={{ fontSize: 10, color: "var(--t1)", padding: "3px 0", borderBottom: "1px solid var(--bd)" }}>{s.from} - {s.to || "?"} - {s.reason} <span style={{ color: "var(--wr)" }}>+{s.daysAdded}j</span></div>)}</div> : null}
        <div className="dps"><div className="dst">{t.addSuspension}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><input className="fi" type="date" style={{ fontSize: 10, padding: "4px 6px", flex: 1 }} value={suspForm.from} onChange={e => setSuspForm({ ...suspForm, from: e.target.value })} /><input className="fi" type="date" style={{ fontSize: 10, padding: "4px 6px", flex: 1 }} value={suspForm.to} onChange={e => setSuspForm({ ...suspForm, to: e.target.value })} /><input className="fi" style={{ fontSize: 10, padding: "4px 6px", flex: 2 }} placeholder={t.suspendReason} value={suspForm.reason} onChange={e => setSuspForm({ ...suspForm, reason: e.target.value })} /><button className="bt bs bsm" onClick={doAddSuspension}><Icon n="pause" s={11} /></button></div>
        </div>
      </div> : null}

      {tab === "history" ? <div className="dps">
        <button className="bt bp" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={doAddSession}><Icon n="plus" s={14} />{t.addSession}</button>
        {timelineItems.length > 0 ? timelineItems.slice(0, 50).map((item, i) => (
          <div key={item.id || ("tl" + i)} className="tl-item">
            <div className="tl-dot" style={{ background: item.bg, color: item.fg }}><Icon n={item.icon} s={10} /></div>
            <div className="tl-body"><p>{item.text}</p><span>{fmtDate(item.date)}</span></div>
            {item.canDel ? <button className="bg0" style={{ color: "var(--er)", padding: 2, marginLeft: "auto" }} onClick={() => doDeleteSession(item.id)}><Icon n="trash" s={11} /></button> : null}
          </div>
        )) : <p style={{ color: "var(--t2)", fontSize: 11, textAlign: "center", padding: 20 }}>{t.noSessions}</p>}
      </div> : null}

      {tab === "renewals" ? <div className="dps"><div className="dst">{t.renewals}</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
          <input className="fi" type="date" style={{ fontSize: 10, padding: "4px 6px", flex: 1 }} value={renForm.date} onChange={e => setRenForm({ ...renForm, date: e.target.value })} />
          <select className="fsl" style={{ fontSize: 10, padding: "4px 6px", flex: 1 }} value={renForm.type} onChange={e => setRenForm({ ...renForm, type: e.target.value })}>{Object.keys(SUB).map(k => <option key={k} value={k}>{subLabels[k]}</option>)}</select>
          <select className="fsl" style={{ fontSize: 10, padding: "4px 6px" }} value={renForm.status} onChange={e => setRenForm({ ...renForm, status: e.target.value })}><option value="renewed">{t.renewed}</option><option value="pending">{t.pending}</option><option value="contacted">{t.contacted}</option></select>
          <button className="bt bp bsm" onClick={doAddRenewal}><Icon n="plus" s={11} /></button>
        </div>
        {c.renewalHistory && c.renewalHistory.length > 0 ? c.renewalHistory.map(r => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--bd)", fontSize: 11 }}>
            <span>{fmtDate(r.date)}</span><span>{subLabels[r.type]}</span><span className={"bg bg-" + (r.status === "renewed" ? "ok" : r.status === "pending" ? "wr" : "inf")}>{t[r.status]}</span>
          </div>
        )) : <p style={{ color: "var(--t2)", fontSize: 11, textAlign: "center", padding: 16 }}>{t.noResults}</p>}
      </div> : null}
    </div>
  )
}
