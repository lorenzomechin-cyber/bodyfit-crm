import { useState, useMemo, Fragment } from 'react'
import { T } from '../lib/i18n'
import { LSTAGES, LCOL } from '../lib/constants'
import { uid, daysTo, fmtDate } from '../lib/helpers'
import Icon from '../components/Icon'
import ImportModal from '../components/ImportModal'

export default function LeadsMetaPage({ leads, setLeads, trials, setTrials, lang, role }) {
  const t = T[lang]
  const [vm, sVM] = useState("pipeline")
  const [sel, setSel] = useState(null)
  const [search, setSearch] = useState("")
  const [dragId, sDI] = useState(null)
  const [dragO, sDO] = useState(null)
  const [qn, sQN] = useState({})
  const [showImport, setShowImport] = useState(false)
  const [sortField, setSF] = useState("date")
  const [sortDir, setSD] = useState("desc")

  const stgLabels = { notContacted: t.notContacted, sessionBooked: t.sessionBooked, sessionDone: t.sessionDone, converted: t.converted, lost: t.lost }
  const srcOptsM = [["meta_ads", "Meta Ads"], ["website", "Site internet"], ["socialMedia", t.socialMedia], ["studio", "Studio"], ["recommendation", t.recommendation], ["advertising", t.advertising]]
  const stOptsM = LSTAGES.map(s => [s, stgLabels[s]])

  const filt = useMemo(() => {
    let r = [...leads]
    if (search) { const q = search.toLowerCase(); r = r.filter(l => l.name.toLowerCase().includes(q) || (l.email || "").toLowerCase().includes(q) || (l.phone || "").includes(q)) }
    return r.sort((a, b) => { const va = a[sortField] || "", vb = b[sortField] || ""; return sortDir === "desc" ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb)) })
  }, [leads, search, sortField, sortDir])

  const toggleSort = k => { sortField === k ? setSD(d => d === "desc" ? "asc" : "desc") : (setSF(k), setSD("desc")) }
  const byS = useMemo(() => { const m = {}; LSTAGES.forEach(s => { m[s] = filt.filter(l => l.stage === s) }); return m }, [filt])

  const moveS = (id, ns) => setLeads(p => p.map(l => l.id === id ? { ...l, stage: ns } : l))

  const transferToTrial = lead => {
    setTrials(p => [...p, { id: uid(), name: lead.name, email: lead.email, phone: lead.phone, stage: "sessionDone", source: "meta_ads", date: new Date().toISOString().split("T")[0], notes: lead.notes || "", contactAttempts: lead.contactAttempts || 0, createdAt: lead.createdAt, lastActionDate: new Date().toISOString().split("T")[0], nextCallback: "", address: "", birthDate: "", nif: "", origin: "Meta Ads", followUpStatus: "" }])
    moveS(lead.id, "converted"); setSel(null)
  }

  const addQN = id => { const n = qn[id]; if (!n?.trim()) return; setLeads(p => p.map(l => l.id === id ? { ...l, notes: l.notes ? l.notes + "\n" + n : n, contactAttempts: (l.contactAttempts || 0) + 1, lastActionDate: new Date().toISOString().split("T")[0] } : l)); sQN(p => ({ ...p, [id]: "" })) }

  const handleDelete = id => { if (window.confirm(t.deleteConfirm)) { setLeads(p => p.filter(x => x.id !== id)); if (sel && sel.id === id) setSel(null) } }

  const updateField = (id, field, value) => { setLeads(p => p.map(x => x.id === id ? { ...x, [field]: value } : x)); setSel(prev => prev && prev.id === id ? { ...prev, [field]: value } : prev) }

  const addNew = () => { const n = { id: uid(), name: "", email: "", phone: "", stage: "notContacted", notes: "", source: "meta_ads", date: new Date().toISOString().split("T")[0], contactAttempts: 0, createdAt: new Date().toISOString().split("T")[0], lastActionDate: "", nextCallback: "", address: "", birthDate: "", nif: "", origin: "Meta Ads", followUpStatus: "" }; setLeads(p => [n, ...p]); setSel(n) }

  const stats = useMemo(() => ({ total: leads.length, cr: leads.length > 0 ? Math.round(leads.filter(l => l.stage === "converted").length / leads.length * 100) : 0 }), [leads])

  return (
    <div className="fin">
      <div className="ph"><div className="phr"><div><h2>{t.leadsMetaTitle}</h2><p>{stats.total} {t.totalLeads} &middot; {stats.cr}% {t.conversionRate}</p></div>
        <div className="pha"><div style={{ display: "flex", gap: 3 }}>{[{ k: "pipeline", l: t.pipelineView }, { k: "list", l: t.trialList }, { k: "meta", l: t.trialMeta }].map(v => <button key={v.k} className={`bt bsm ${vm === v.k ? "bp" : "bs"}`} onClick={() => sVM(v.k)}>{v.l}</button>)}</div>
          {role === "admin" && <Fragment><button className="bt bp" onClick={addNew}><Icon n="plus" s={13} />{t.addLead}</button><button className="bt bs" onClick={() => setShowImport(true)}><Icon n="upload" s={13} />{t.importExcel}</button></Fragment>}
        </div></div></div>

      <div style={{ marginBottom: 12 }}><div className="ts" style={{ maxWidth: 360 }}><Icon n="search" s={13} /><input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      {vm === "pipeline" && <div className="pipe">{LSTAGES.map(stage => <div key={stage} className="pcol"><div className="pch" style={{ background: `${LCOL[stage]}12` }}><h4><div style={{ width: 7, height: 7, borderRadius: 4, background: LCOL[stage] }} />{stgLabels[stage]}</h4><span className="cnt">{byS[stage]?.length || 0}</span></div>
        <div className={`pcc ${dragO === stage ? "dov" : ""}`} onDragOver={e => { e.preventDefault(); sDO(stage) }} onDragLeave={() => sDO(null)} onDrop={e => { e.preventDefault(); if (dragId) { stage === "converted" ? transferToTrial(leads.find(l => l.id === dragId)) : moveS(dragId, stage) } sDI(null); sDO(null) }}>
          {(byS[stage] || []).map(ld => <div key={ld.id} className={`lc ${dragId === ld.id ? "drg" : ""}`} draggable onDragStart={() => sDI(ld.id)} onClick={() => setSel(ld)} style={{ cursor: "pointer" }}>
            <div className="la" onClick={e => e.stopPropagation()}>
              {stage !== "converted" && stage !== "lost" && <button className="bg0" style={{ padding: 1, color: "var(--ok)" }} onClick={() => { const i = LSTAGES.indexOf(stage); if (i < 3) { const ns = LSTAGES[i + 1]; ns === "converted" ? transferToTrial(ld) : moveS(ld.id, ns) } }}><Icon n="cR" s={11} /></button>}</div>
            <h5>{ld.name}</h5>
            {ld.phone && <div className="li"><Icon n="phone" s={9} />{ld.phone}</div>}
            {ld.email && <div className="li"><Icon n="mail" s={9} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170, display: "inline-block" }}>{ld.email}</span></div>}
            {ld.contactAttempts > 0 && <div className="li"><Icon n="repeat" s={9} />{ld.contactAttempts}x</div>}
            {ld.notes && <div className="ln">{ld.notes}</div>}
            {ld.date && <div className="ld">{ld.date}</div>}
            {stage !== "converted" && stage !== "lost" && <div style={{ marginTop: 5, display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}><input className="fi" style={{ padding: "3px 6px", fontSize: 9, flex: 1 }} placeholder={t.quickNote} value={qn[ld.id] || ""} onChange={e => sQN(p => ({ ...p, [ld.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addQN(ld.id) }} /><button className="bt bs bsm" style={{ padding: "3px 5px" }} onClick={() => addQN(ld.id)}><Icon n="plus" s={9} /></button></div>}
            {stage === "sessionDone" && <button className="bt bok bsm" style={{ width: "100%", justifyContent: "center", marginTop: 5 }} onClick={e => { e.stopPropagation(); transferToTrial(ld) }}><Icon n="user" s={11} />{t.transferToTrial}</button>}
          </div>)}</div></div>)}</div>}

      {vm === "list" && <div className="tc"><div style={{ overflowX: "auto" }}><table><thead><tr>
        <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>{t.name} {sortField === "name" ? (sortDir === "desc" ? "\u2193" : "\u2191") : ""}</th>
        <th>{t.phone}</th>
        <th onClick={() => toggleSort("date")} style={{ cursor: "pointer" }}>{t.leadDate} {sortField === "date" ? (sortDir === "desc" ? "\u2193" : "\u2191") : ""}</th>
        <th>{t.leadStatus}</th><th>{t.notes}</th><th>{t.actions}</th>
      </tr></thead><tbody>
        {filt.map(l => <tr key={l.id} onClick={() => setSel(l)} style={{ cursor: "pointer", background: sel?.id === l.id ? "var(--acg)" : "" }}>
          <td style={{ fontWeight: 600 }}><div>{l.name}</div><div style={{ fontSize: 9, color: "var(--t2)" }}>{l.email}</div></td>
          <td style={{ fontFamily: "var(--fm)", fontSize: 10 }}>{l.phone || "\u2014"}</td>
          <td style={{ fontSize: 10, fontFamily: "var(--fm)", color: "var(--t1)" }}>{l.date ? fmtDate(l.date) : "\u2014"}</td>
          <td><span className="bg" style={{ background: LCOL[l.stage] + "14", color: LCOL[l.stage] }}>{stgLabels[l.stage]}</span></td>
          <td style={{ fontSize: 10, color: "var(--t1)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.notes || "\u2014"}</td>
          <td><div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
            {l.stage !== "converted" && <button className="bg0" style={{ color: "var(--ok)" }} onClick={() => transferToTrial(l)} title={t.transferToTrial}><Icon n="user" s={12} /></button>}
            {role === "admin" && <button className="bg0" style={{ color: "var(--er)" }} onClick={() => handleDelete(l.id)}><Icon n="trash" s={12} /></button>}
          </div></td></tr>)}
      </tbody></table></div></div>}

      {vm === "meta" && <div style={{ maxWidth: 660 }}><div className="mtc">
        <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="#2E6DA4"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" /></svg>{t.metaIntegration}</h3>
        <div style={{ background: "var(--b2)", borderRadius: 7, padding: 14, marginBottom: 14 }}><div className="fg2" style={{ gap: 10 }}>
          <div className="fg"><label className="fl">{t.webhookUrl}</label><div style={{ display: "flex", gap: 5 }}><input className="fi" readOnly value="https://your-crm.com/api/webhooks/meta-leads" style={{ flex: 1, fontSize: 10 }} /><button className="bt bs bsm" onClick={() => navigator.clipboard?.writeText("https://your-crm.com/api/webhooks/meta-leads")}>Copy</button></div></div>
          <div className="fg"><label className="fl">{t.metaPageId}</label><input className="fi" placeholder="123456789012345" /></div>
          <div className="fg"><label className="fl">{t.metaAccessToken}</label><input className="fi" type="password" placeholder="EAABsbCS1iHg..." /></div>
        </div><div style={{ display: "flex", gap: 6, marginTop: 14 }}><button className="bt bp bsm"><Icon n="link" s={12} />{t.testConnection}</button><button className="bt bs bsm"><Icon n="check" s={12} />{t.saveConfig}</button></div></div>
        <div style={{ background: "var(--b1)", borderRadius: 7, padding: 14 }}><h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{t.howItWorks}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[{ i: "cloud", tt: t.step1t, d: t.step1d }, { i: "repeat", tt: t.step2t, d: t.step2d }, { i: "user", tt: t.step3t, d: t.step3d }, { i: "phone", tt: t.step4t, d: t.step4d }].map((s, i) =>
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--acg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ac2)" }}><Icon n={s.i} s={14} /></div><div><p style={{ fontSize: 11, fontWeight: 600 }}>{s.tt}</p><p style={{ fontSize: 10, color: "var(--t1)", marginTop: 1 }}>{s.d}</p></div></div>)}</div></div>
      </div></div>}

      {sel && <div className="dp">
        <div className="dph"><div><h3 style={{ fontSize: 16, fontWeight: 700 }}>{sel.name || t.addLead}</h3>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{sel.date && <span className="bg bg-inf">{fmtDate(sel.date)}</span>}<span className="bg" style={{ background: LCOL[sel.stage] + "14", color: LCOL[sel.stage] }}>{stgLabels[sel.stage]}</span></div>
        </div><div style={{ display: "flex", gap: 4 }}>
          {sel.stage !== "converted" && <button className="bt bok bsm" onClick={() => transferToTrial(sel)}><Icon n="user" s={12} />{t.transferToTrial}</button>}
          <button className="bg0" onClick={() => setSel(null)}><Icon n="x" s={15} /></button></div></div>

        <div className="dps"><div className="dst">{t.contactInfo}</div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.name}</label><input className="fi" value={sel.name || ""} onChange={e => updateField(sel.id, "name", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.email}</label><input className="fi" value={sel.email || ""} onChange={e => updateField(sel.id, "email", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.phone}</label><input className="fi" value={sel.phone || ""} onChange={e => updateField(sel.id, "phone", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.leadDate}</label><input className="fi" type="date" value={sel.date || ""} onChange={e => updateField(sel.id, "date", e.target.value)} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="fl">{t.source}</label><select className="fsl" value={sel.source || ""} onChange={e => updateField(sel.id, "source", e.target.value)}><option value="">&mdash;</option>{srcOptsM.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="fg"><label className="fl">{t.leadStatus}</label><select className="fsl" value={sel.stage || ""} onChange={e => updateField(sel.id, "stage", e.target.value)}>{stOptsM.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div className="dps"><div className="dst">{t.notes}</div>
          <textarea className="fta" value={sel.notes || ""} onChange={e => updateField(sel.id, "notes", e.target.value)} />
        </div>
      </div>}

      {showImport && <ImportModal mode="leads" onImport={({ newClients }) => { setLeads(p => [...p, ...newClients]); setShowImport(false) }} onClose={() => setShowImport(false)} existingItems={leads} lang={lang} />}
    </div>
  )
}
