import { useState, useMemo, Fragment } from 'react'
import { sbDelete } from '../lib/supabase'
import { T } from '../lib/i18n'
import { SUB, LSTAGES } from '../lib/constants'
import { uid, daysTo, fmtDate, waLink, generateReferralCode, detectLang, waMsg } from '../lib/helpers'
import Icon from '../components/Icon'
import ImportModal from '../components/ImportModal'

export default function TrialsPage({ trials, setTrials, clients, setClients, lang, role }) {
  const t = T[lang]
  const [sel, setSel] = useState(null)
  const [search, setSearch] = useState("")
  const [filterFU, setFilterFU] = useState("all")
  const [showImport, setShowImport] = useState(false)
  const [sortField, setSortField] = useState("date")
  const [sortDir, setSortDir] = useState("desc")
  const [checked, setChecked] = useState({})

  const fuLabels = { msgSent: t.msgSent, noAnswer: t.noAnswer, callBack: t.callBack, interested: t.interested, notInterested: t.notInterested, comingBack: t.comingBack }
  const srcOpts = [["meta_ads", "Meta Ads"], ["website", "Site internet"], ["socialMedia", t.socialMedia], ["studio", "Studio"], ["recommendation", t.recommendation], ["advertising", t.advertising]]
  const fuOpts = [["msgSent", t.msgSent], ["noAnswer", t.noAnswer], ["callBack", t.callBack], ["interested", t.interested], ["notInterested", t.notInterested], ["comingBack", t.comingBack]]
  const stOpts = LSTAGES.map(s => [s, { notContacted: t.notContacted, sessionBooked: t.sessionBooked, sessionDone: t.sessionDone, converted: t.converted, lost: t.lost }[s]])

  const hasFicha = tr => !!(tr.address || tr.birthDate || tr.nif)
  const getDaysSince = tr => { const d = tr.lastActionDate || tr.createdAt || tr.date; if (!d) return 999; return daysTo(d, new Date().toISOString().split("T")[0]) }

  const filtered = useMemo(() => {
    let r = trials.filter(tr => tr.stage !== "converted")
    if (search) { const q = search.toLowerCase(); r = r.filter(tr => tr.name.toLowerCase().includes(q) || (tr.email || "").toLowerCase().includes(q) || (tr.phone || "").includes(q)) }
    if (filterFU === "toFollow") r = r.filter(tr => !tr.followUpStatus || tr.followUpStatus === "noAnswer" || tr.followUpStatus === "msgSent")
    if (filterFU === "withCallback") r = r.filter(tr => tr.nextCallback)
    if (filterFU === "interested") r = r.filter(tr => tr.followUpStatus === "interested" || tr.followUpStatus === "comingBack")
    return r.sort((a, b) => { const va = a[sortField] || "", vb = b[sortField] || ""; return sortDir === "desc" ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb)) })
  }, [trials, search, filterFU, sortField, sortDir])

  const toggleSort = k => { sortField === k ? setSortDir(d => d === "desc" ? "asc" : "desc") : (setSortField(k), setSortDir("desc")) }
  const checkedCount = Object.keys(checked).filter(k => checked[k]).length
  function toggleCheck(id) { const next = { ...checked }; if (next[id]) { delete next[id] } else { next[id] = true } setChecked(next) }
  function toggleAll() { if (checkedCount > 0) { setChecked({}) } else { const next = {}; filtered.forEach(tr => { next[tr.id] = true }); setChecked(next) } }
  function deleteChecked() { const ids = Object.keys(checked).filter(k => checked[k]); if (!ids.length) return; ids.forEach(id => sbDelete("trials", id)); setTrials(p => p.filter(x => !checked[x.id])); if (sel && checked[sel.id]) setSel(null); setChecked({}) }

  const [showConvert, setShowConvert] = useState(false)
  const [convSub, setConvSub] = useState("12m")
  const [convStart, setConvStart] = useState(new Date().toISOString().split("T")[0])
  const subOptsC = { "12m": t.months12, "6m": t.months6, "3m": t.months3, p10: t.pack10, p15: t.pack15, p20: t.pack20, premium: t.premium }

  const openConvert = () => { setConvSub("12m"); setConvStart(new Date().toISOString().split("T")[0]); setShowConvert(true) }
  const doConvert = () => {
    if (!sel) return
    const sub = SUB[convSub]; const cr = sub.cr
    const endDate = sub.mo ? (() => { const d = new Date(convStart); d.setMonth(d.getMonth() + sub.mo); return d.toISOString().split("T")[0] })() : ""
    // Extract referral code from notes (format: "Ref: CODE")
    const refMatch = (sel.notes || '').match(/Ref:\s*([A-Z0-9-]+)/)
    const referredByCode = refMatch ? refMatch[1] : ''
    const newClient = { id: uid(), name: sel.name, status: "active", gender: "female", phone: sel.phone, email: sel.email, startDate: convStart, endDate: endDate, source: sel.origin || sel.source || "studio", sub: convSub, credits: cr, used: 0, bonus: 0, rem: cr, notes: "", nif: sel.nif || "", birthDate: sel.birthDate || "", address: sel.address || "", contraindications: "", medicalNotes: "", sessions: [], suspensionHistory: [], renewalHistory: [], referralCode: generateReferralCode(sel.name), referredBy: referredByCode, referralCount: 0, referralBonus: 0 }
    // If referred, reward the referrer
    if (referredByCode) {
      setClients(p => {
        const updated = p.map(c => c.referralCode === referredByCode ? { ...c, referralCount: (c.referralCount || 0) + 1, referralBonus: (c.referralBonus || 0) + 1, bonus: (c.bonus || 0) + 1, rem: (c.rem || 0) + 1 } : c)
        return [...updated, newClient]
      })
    } else {
      setClients(p => [...p, newClient])
    }
    sbDelete("trials", sel.id)
    setTrials(p => p.filter(x => x.id !== sel.id))
    setSel(null); setShowConvert(false)
  }

  const handleImport = (data) => { setTrials(p => [...p, ...(data.newClients || [])]); setShowImport(false) }

  const updateField = (id, field, value) => {
    setTrials(p => p.map(x => x.id === id ? { ...x, [field]: value } : x))
    setSel(prev => prev && prev.id === id ? { ...prev, [field]: value } : prev)
  }

  const addNew = () => {
    const n = { id: uid(), name: "", email: "", phone: "", stage: "sessionDone", notes: "", source: "studio", date: new Date().toISOString().split("T")[0], contactAttempts: 0, createdAt: new Date().toISOString().split("T")[0], lastActionDate: "", nextCallback: "", address: "", birthDate: "", nif: "", origin: "", followUpStatus: "" }
    setTrials(p => [n, ...p]); setSel(n)
  }

  const stats = useMemo(() => {
    const active = trials.filter(tr => tr.stage !== "converted").length
    const conv = trials.filter(tr => tr.stage === "converted").length
    const toFollow = trials.filter(tr => tr.stage !== "converted" && (!tr.followUpStatus || tr.followUpStatus === "noAnswer" || tr.followUpStatus === "msgSent")).length
    const intCount = trials.filter(tr => tr.followUpStatus === "interested" || tr.followUpStatus === "comingBack").length
    return { active, conv, toFollow, intCount, total: trials.length }
  }, [trials])

  return (
    <div className="fin">
      <div className="ph"><div className="phr">
        <div><h2>{t.trialSessions}</h2><p>{stats.total} {t.totalLabel} &middot; {stats.active} {t.activeCount} &middot; {stats.conv} {t.convertedCount}</p></div>
        <div className="pha">
          <div style={{ display: "flex", gap: 3 }}>{[{ k: "all", l: t.allFollowUps }, { k: "toFollow", l: t.toFollow }, { k: "withCallback", l: t.withCallback }, { k: "interested", l: t.interested }].map(v =>
            <button key={v.k} className={"bt bsm " + (filterFU === v.k ? "bp" : "bs")} onClick={() => setFilterFU(v.k)}>{v.l}</button>)}</div>
          {role === "admin" ? <Fragment>
            <button className="bt bp" onClick={addNew}><Icon n="plus" s={13} />{t.addTrial}</button>
            {checkedCount > 0 ? <button className="bt bdd" onClick={deleteChecked}><Icon n="trash" s={13} />{t.deleteYes} ({checkedCount})</button> : null}
            <button className="bt bs" onClick={() => setShowImport(true)}><Icon n="upload" s={13} />{t.importExcel}</button>
          </Fragment> : null}
        </div></div></div>

      <div style={{ marginBottom: 12 }}><div className="ts" style={{ maxWidth: 360 }}><Icon n="search" s={13} /><input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      <div className="cg" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
        <div className="cd" style={{ padding: 12 }}><div className="sl">{t.toFollow}</div><div className="sv sv-wr" style={{ fontSize: 22 }}>{stats.toFollow}</div></div>
        <div className="cd" style={{ padding: 12 }}><div className="sl">{t.interested}</div><div className="sv sv-ok" style={{ fontSize: 22 }}>{stats.intCount}</div></div>
        <div className="cd" style={{ padding: 12 }}><div className="sl">{t.converted}</div><div className="sv sv-ac" style={{ fontSize: 22 }}>{stats.conv}</div></div>
        <div className="cd" style={{ padding: 12 }}><div className="sl">{t.conversionRate}</div><div className="sv sv-ok" style={{ fontSize: 22 }}>{stats.total > 0 ? Math.round(stats.conv / stats.total * 100) : 0}%</div></div>
      </div>

      <div className="tc"><div style={{ overflowX: "auto" }}><table><thead><tr>
        {role === "admin" ? <th style={{ width: 32 }}><input type="checkbox" checked={checkedCount > 0 && checkedCount === filtered.length} onChange={toggleAll} /></th> : null}
        <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>{t.name} {sortField === "name" ? (sortDir === "desc" ? "\u2193" : "\u2191") : ""}</th>
        <th>{t.phone}</th>
        <th onClick={() => toggleSort("date")} style={{ cursor: "pointer" }}>{t.trialDate} {sortField === "date" ? (sortDir === "desc" ? "\u2193" : "\u2191") : ""}</th>
        <th>{t.followUp}</th><th>{t.nextCallback}</th><th>{t.notes}</th><th>{t.actions}</th>
      </tr></thead><tbody>
        {!filtered.length ? <tr><td colSpan={role === "admin" ? "9" : "8"} style={{ textAlign: "center", padding: 28, color: "var(--t2)" }}>{t.noResults}</td></tr> :
          filtered.map(tr => { const ds = getDaysSince(tr); return (
            <tr key={tr.id} onClick={() => setSel(tr)} style={{ cursor: "pointer", background: sel && sel.id === tr.id ? "var(--acg)" : checked[tr.id] ? "var(--erg)" : "" }}>
              {role === "admin" ? <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={!!checked[tr.id]} onChange={() => toggleCheck(tr.id)} /></td> : null}
              <td style={{ fontWeight: 600 }}><div>{tr.name}</div><div style={{ fontSize: 9, color: "var(--t2)" }}>{tr.email}</div></td>
              <td style={{ fontFamily: "var(--fm)", fontSize: 10 }}>{tr.phone || "\u2014"}</td>
              <td style={{ fontSize: 10, fontFamily: "var(--fm)", color: "var(--t1)" }}>{tr.date ? fmtDate(tr.date) : "\u2014"}</td>
              <td>{tr.followUpStatus ? <span className="bg" style={{ background: tr.followUpStatus === "interested" || tr.followUpStatus === "comingBack" ? "var(--okg)" : tr.followUpStatus === "notInterested" ? "var(--erg)" : "var(--wrg)", color: tr.followUpStatus === "interested" || tr.followUpStatus === "comingBack" ? "var(--ok)" : tr.followUpStatus === "notInterested" ? "var(--er)" : "var(--wr)", fontSize: 8 }}>{fuLabels[tr.followUpStatus] || tr.followUpStatus}</span> : "\u2014"}</td>
              <td style={{ fontSize: 10 }}>{tr.nextCallback ? <span style={{ color: daysTo(new Date().toISOString().split("T")[0], tr.nextCallback) < 0 ? "var(--er)" : "var(--ok)", fontFamily: "var(--fm)", fontSize: 10 }}>{tr.nextCallback}</span> : "\u2014"}</td>
              <td style={{ fontSize: 10, color: "var(--t1)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.notes || "\u2014"}</td>
              <td><div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                {tr.phone ? <a href={waLink(tr.phone, waMsg('trialReminder', tr.lang || detectLang(tr.phone), tr.name || ''))} target="_blank" rel="noopener" className="bg0" style={{ color: "#25D366", textDecoration: "none" }} title="WhatsApp"><Icon n="wa" s={12} /></a> : null}
                <button className="bg0" style={{ color: "var(--ok)" }} onClick={() => { setSel(tr); setShowConvert(true); setConvSub('12m'); setConvStart(new Date().toISOString().split('T')[0]) }} title={t.transferToClient}><Icon n="user" s={12} /></button>
              </div></td>
            </tr>
          )})}
      </tbody></table></div></div>

      {sel && <div className="dp">
        <div className="dph"><div><h3 style={{ fontSize: 16, fontWeight: 700 }}>{sel.name || t.addTrial}</h3>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{sel.date && <span className="bg bg-inf">{fmtDate(sel.date)}</span>}{hasFicha(sel) && <span className="bg bg-ok">{t.fichaFilled}</span>}</div>
        </div><div style={{ display: "flex", gap: 4 }}><button className="bt bok bsm" onClick={openConvert}><Icon n="user" s={12} />{t.transferToClient}</button><button className="bg0" onClick={() => setSel(null)}><Icon n="x" s={15} /></button></div></div>

        <div className="dps"><div className="dst">{t.contactInfo}</div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.name} *</label><input className="fi" value={sel.name || ""} onChange={e => updateField(sel.id, "name", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.email}</label><input className="fi" value={sel.email || ""} onChange={e => updateField(sel.id, "email", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.phone}</label><div style={{ display: "flex", gap: 4 }}><input className="fi" style={{ flex: 1 }} value={sel.phone || ""} onChange={e => updateField(sel.id, "phone", e.target.value)} />{sel.phone ? <a href={waLink(sel.phone, waMsg('trialReminder', sel.lang || detectLang(sel.phone), sel.name || ''))} target="_blank" rel="noopener" className="bt bs bsm" style={{ textDecoration: "none", color: "#25D366" }}><Icon n="wa" s={11} /></a> : null}</div></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.trialDate}</label><input className="fi" type="date" value={sel.date || ""} onChange={e => updateField(sel.id, "date", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.source}</label><select className="fsl" value={sel.source || ""} onChange={e => updateField(sel.id, "source", e.target.value)}><option value="">&mdash;</option>{srcOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="fg"><label className="fl">{t.leadStatus}</label><select className="fsl" value={sel.stage || ""} onChange={e => updateField(sel.id, "stage", e.target.value)}>{stOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>

        <div className="dps"><div className="dst">{t.editTrial} (Google Forms)</div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.address}</label><input className="fi" value={sel.address || ""} onChange={e => updateField(sel.id, "address", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.birthDate}</label><input className="fi" type="date" value={sel.birthDate || ""} onChange={e => updateField(sel.id, "birthDate", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.nif}</label><input className="fi" value={sel.nif || ""} onChange={e => updateField(sel.id, "nif", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.origin}</label><input className="fi" value={sel.origin || ""} onChange={e => updateField(sel.id, "origin", e.target.value)} /></div>
        </div>

        <div className="dps"><div className="dst">{t.followUp}</div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.followUp}</label><select className="fsl" value={sel.followUpStatus || ""} onChange={e => { updateField(sel.id, "followUpStatus", e.target.value); updateField(sel.id, "lastActionDate", new Date().toISOString().split("T")[0]) }}><option value="">&mdash;</option>{fuOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="fg"><label className="fl">{t.nextCallback}</label><input className="fi" type="date" value={sel.nextCallback || ""} onChange={e => updateField(sel.id, "nextCallback", e.target.value)} /></div>
        </div>

        <div className="dps"><div className="dst">{t.notes}</div>
          <textarea className="fta" value={sel.notes || ""} onChange={e => updateField(sel.id, "notes", e.target.value)} />
        </div>

        {showConvert && <div className="dps" style={{ background: "var(--okg)", borderRadius: 0 }}>
          <div className="dst" style={{ color: "var(--ok)" }}><Icon n="user" s={10} /> {t.transferToClient}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {Object.entries(subOptsC).map(([k, label]) => { const s = SUB[k]; return (
              <div key={k} onClick={() => setConvSub(k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: convSub === k ? "var(--acg)" : "var(--b1)", border: `1px solid ${convSub === k ? "var(--ac)" : "var(--bd)"}`, borderRadius: 7, cursor: "pointer", transition: "all .15s" }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${convSub === k ? "var(--ac)" : "var(--bd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{convSub === k && <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--ac)" }} />}</div>
                <span style={{ fontSize: 11, fontWeight: 600, flex: 1, color: convSub === k ? "var(--ac2)" : "var(--t0)" }}>{label}</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: "var(--ac2)" }}>{k === "premium" ? "\u221e" : s.cr + " cr"}</span>
              </div>
            )})}
          </div>
          <div className="fg" style={{ marginBottom: 10 }}><label className="fl">{t.startDate}</label><input className="fi" type="date" value={convStart} onChange={e => setConvStart(e.target.value)} /></div>
          <div style={{ display: "flex", gap: 6 }}><button className="bt bs" onClick={() => setShowConvert(false)} style={{ flex: 1, justifyContent: "center" }}>{t.cancel}</button><button className="bt bp" onClick={doConvert} style={{ flex: 1, justifyContent: "center" }}><Icon n="check" s={12} />{t.transferToClient}</button></div>
        </div>}
      </div>}

      {showImport && <ImportModal mode="trials" onImport={handleImport} onClose={() => setShowImport(false)} existingItems={trials} lang={lang} />}
    </div>
  )
}
