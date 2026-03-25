import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { T } from '../lib/i18n'
import { SUB, STATUSES } from '../lib/constants'
import { uid, daysTo, fmtDate, calcAge, getLastSession, getDaysInactive, getFrequency, getLastPaymentMonth, getAdjustedEndDate } from '../lib/helpers'
import Icon from '../components/Icon'
import CDetail from '../components/CDetail'
import ImportModal from '../components/ImportModal'

export default function ClientsPage({ clients, setClients, trials, setTrials, lang, role }) {
  const t = T[lang]
  const [searchC, setSearchC] = useState("")
  const [fSC, setFSC] = useState("all")
  const [fTC, setFTC] = useState("all")
  const [fQC, setFQC] = useState("all")
  const [sortKeyC, setSortKey] = useState("startDate")
  const [sortDirC, setSortDirC] = useState("desc")
  const [pgC, setPgC] = useState(0); const pp = 15
  const [selC, setSelC] = useState(null)
  const [showImportC, setShowImportC] = useState(false)
  const [checked, setChecked] = useState({})
  const subLC = { "12m": t.months12, "6m": t.months6, "3m": t.months3, p10: t.pack10, p15: t.pack15, p20: t.pack20, premium: t.premium }

  const filt = useMemo(() => {
    let r = clients.slice()
    if (searchC) { const q = searchC.toLowerCase(); r = r.filter(c => c.name.toLowerCase().indexOf(q) !== -1 || (c.email || "").toLowerCase().indexOf(q) !== -1 || (c.phone || "").indexOf(q) !== -1) }
    if (fSC !== "all") r = r.filter(c => c.status === fSC)
    if (fTC !== "all") r = r.filter(c => c.sub === fTC)
    if (fQC === "lowCredits") r = r.filter(c => c.sub !== "premium" && c.rem <= 3)
    if (fQC === "expiring") { const td = new Date().toISOString().split("T")[0]; r = r.filter(c => c.endDate && c.status === "active" && daysTo(td, getAdjustedEndDate(c)) > 0 && daysTo(td, getAdjustedEndDate(c)) <= 30) }
    if (fQC === "lastPay") { r = r.filter(c => { const lp = getLastPaymentMonth(c); return lp && (lp.isThisMonth || lp.isNextMonth) }) }
    r.sort((a, b) => {
      let va = a[sortKeyC] || "", vb = b[sortKeyC] || ""
      if (sortKeyC === "lastSess") { va = getLastSession(a) || ""; vb = getLastSession(b) || "" }
      if (sortKeyC === "freq") { va = getFrequency(a); vb = getFrequency(b) }
      if (sortKeyC === "sessCount") { va = (a.sessions || []).length; vb = (b.sessions || []).length }
      return typeof va === "number" ? sortDirC === "asc" ? va - vb : vb - va : sortDirC === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return r
  }, [clients, searchC, fSC, fTC, fQC, sortKeyC, sortDirC])

  const paged = filt.slice(pgC * pp, (pgC + 1) * pp); const totPg = Math.ceil(filt.length / pp)
  const checkedCount = Object.keys(checked).filter(k => checked[k]).length

  function sortCol(k) { if (sortKeyC === k) { setSortDirC(sortDirC === "asc" ? "desc" : "asc") } else { setSortKey(k); setSortDirC("asc") } }
  function toggleCheck(id) { const next = { ...checked }; if (next[id]) { delete next[id] } else { next[id] = true } setChecked(next) }
  function toggleAll() { if (checkedCount > 0) { setChecked({}) } else { const next = {}; paged.forEach(c => { next[c.id] = true }); setChecked(next) } }
  function deleteChecked() { const ids = Object.keys(checked).filter(k => checked[k]); if (!ids.length) return; setClients(p => p.filter(x => !checked[x.id])); if (selC && checked[selC.id]) setSelC(null); setChecked({}) }
  function updateClient(updated) { setClients(p => p.map(x => x.id === updated.id ? updated : x)); setSelC(updated) }
  function addNew() { const n = { id: uid(), name: "", status: "active", gender: "female", phone: "", email: "", startDate: new Date().toISOString().split("T")[0], endDate: "", source: "studio", sub: "12m", credits: 48, used: 0, bonus: 0, rem: 48, notes: "", nif: "", birthDate: "", contraindications: "", medicalNotes: "", sessions: [], suspensionHistory: [], renewalHistory: [] }; setClients(p => [n, ...p]); setSelC(n) }
  function handleImport(data) { setClients(p => { let updated = p.slice(); if (data.overwrites) { data.overwrites.forEach(ow => { updated = updated.map(c => c.id === ow.id ? ow : c) }) } if (data.merges) { data.merges.forEach(mg => { updated = updated.map(c => { if (c.id !== mg.id) return c; const merged = { ...c }; Object.keys(mg).forEach(k => { if (mg[k] && !c[k]) merged[k] = mg[k] }); return merged }) }) } return updated.concat(data.newClients || []) }); setShowImportC(false) }

  const activeCount = clients.filter(c => c.status === "active").length
  const inactiveCount = clients.filter(c => c.status === "inactive").length
  const suspendedCount = clients.filter(c => c.status === "suspended").length

  function exportClientsXls() { const ws = XLSX.utils.json_to_sheet(clients.map(c => ({ Nom: c.name, Status: c.status, Tel: c.phone, Email: c.email, Debut: c.startDate, Fin: c.endDate, Abo: c.sub, Credits: c.credits, Utilises: c.used, Restants: c.rem, Notes: c.notes }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Clients"); XLSX.writeFile(wb, "bodyfit_clients.xlsx") }

  return (
    <div className="fin">
      <div className="ph"><div className="phr"><div><h2>{t.clients}</h2><p>{filt.length} {t.entries}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}><span className="bg bg-ok" style={{ fontSize: 10 }}>{activeCount} {t.active}</span><span className="bg bg-inactive" style={{ fontSize: 10 }}>{inactiveCount} {t.inactive}</span><span className="bg bg-wr" style={{ fontSize: 10 }}>{suspendedCount} {t.suspended}</span></div>
      </div>
        <div className="pha">{role === "admin" ? <span>
          <button className="bt bp" onClick={addNew}><Icon n="plus" s={13} />{t.addClient}</button>
          {checkedCount > 0 ? <button className="bt bdd" onClick={deleteChecked}><Icon n="trash" s={13} />{t.deleteYes} ({checkedCount})</button> : null}
          <button className="bt bs" onClick={exportClientsXls}><Icon n="dl" s={13} />{t.exportCsv}</button>
          <button className="bt bs" onClick={() => setShowImportC(true)}><Icon n="upload" s={13} />{t.importExcel}</button>
        </span> : null}</div></div></div>

      <div className="tc"><div className="tb">
        <div className="ts"><Icon n="search" s={13} /><input placeholder={t.search} value={searchC} onChange={e => { setSearchC(e.target.value); setPgC(0) }} /></div>
        <select className="tf" value={fSC} onChange={e => { setFSC(e.target.value); setPgC(0) }}><option value="all">{t.allStatuses}</option>{STATUSES.map(s => <option key={s} value={s}>{t[s]}</option>)}</select>
        <select className="tf" value={fTC} onChange={e => { setFTC(e.target.value); setPgC(0) }}><option value="all">{t.allTypes}</option>{Object.keys(SUB).map(k => <option key={k} value={k}>{subLC[k]}</option>)}</select>
        <select className="tf" value={fQC} onChange={e => { setFQC(e.target.value); setPgC(0) }}><option value="all">--</option><option value="lowCredits">{t.lowCredits}</option><option value="expiring">{t.upcomingRenewals}</option></select>
      </div>
        <div style={{ overflowX: "auto" }}><table><thead><tr>
          {role === "admin" ? <th style={{ width: 32 }}><input type="checkbox" checked={checkedCount > 0 && checkedCount === paged.length} onChange={toggleAll} /></th> : null}
          <th onClick={() => sortCol("name")} style={{ cursor: "pointer" }}>{t.name}</th><th>{t.phone}</th><th onClick={() => sortCol("status")}>{t.status}</th><th onClick={() => sortCol("startDate")} style={{ cursor: "pointer" }}>{t.startDate}</th><th onClick={() => sortCol("sub")}>{t.subscriptionType}</th><th onClick={() => sortCol("rem")}>{t.creditsRemaining}</th><th onClick={() => sortCol("lastSess")}>{t.lastSession}</th>
        </tr></thead><tbody>
          {paged.length === 0 ? <tr><td colSpan={role === "admin" ? "9" : "8"} style={{ textAlign: "center", padding: 28, color: "var(--t2)" }}>{t.noResults}</td></tr> : paged.map(c => {
            const di2 = getDaysInactive(c); const ls2 = getLastSession(c); const td3 = new Date().toISOString().split("T")[0]; const adjE2 = getAdjustedEndDate(c); const dLeft = c.endDate && c.status === "active" ? daysTo(td3, adjE2) : 999
            return <tr key={c.id} onClick={() => setSelC(c)} style={{ cursor: "pointer", background: selC && selC.id === c.id ? "var(--acg)" : checked[c.id] ? "var(--erg)" : "" }}>
              {role === "admin" ? <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={!!checked[c.id]} onChange={() => toggleCheck(c.id)} /></td> : null}
              <td style={{ fontWeight: 600 }}><div>{c.name}</div>{c.birthDate ? <span style={{ fontSize: 9, color: "var(--t2)" }}>{calcAge(c.birthDate)} {t.years}</span> : null}</td>
              <td><div style={{ fontSize: 10, fontFamily: "var(--fm)" }}>{c.phone || "--"}</div><div style={{ fontSize: 9, color: "var(--t2)" }}>{c.email || ""}</div></td>
              <td><span className={"bg bg-" + c.status}>{t[c.status]}</span>{dLeft > 0 && dLeft <= 30 ? <span className="bg bg-er" style={{ marginLeft: 3, fontSize: 7 }}>{dLeft}j</span> : null}</td>
              <td style={{ fontSize: 10, fontFamily: "var(--fm)", color: "var(--t1)" }}>{c.startDate ? fmtDate(c.startDate) : "--"}</td>
              <td style={{ fontSize: 10 }}>{subLC[c.sub] || "--"}</td>
              <td>{c.sub === "premium" ? <span style={{ fontFamily: "var(--fm)", fontWeight: 700, fontSize: 11, color: "var(--ok)" }}>Premium</span> : <div style={{ minWidth: 90 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}><span style={{ color: "var(--t2)" }}>{c.used} {t.creditsUsed}</span><span style={{ fontFamily: "var(--fm)", fontWeight: 700, color: c.rem <= 3 ? "var(--er)" : c.rem <= 10 ? "var(--wr)" : "var(--ok)" }}>{c.rem} {t.creditsRemaining}</span></div><div style={{ height: 4, background: "var(--b0)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, width: ((c.credits || 0) + (c.bonus || 0)) > 0 ? Math.min(c.used / ((c.credits || 0) + (c.bonus || 0)) * 100, 100) + "%" : "0%", background: c.rem <= 3 ? "var(--er)" : c.rem <= 10 ? "var(--wr)" : "var(--ok)" }} /></div></div>}</td>
              <td style={{ fontSize: 10 }}>{ls2 ? <span style={{ color: di2 > 14 ? "var(--er)" : "var(--t1)" }}>{ls2} <span style={{ fontSize: 8 }}>({di2}j)</span></span> : "--"}</td>
            </tr>
          })}
        </tbody></table></div>
        {totPg > 1 ? <div className="tpg"><span>{t.showing} {pgC * pp + 1}-{Math.min((pgC + 1) * pp, filt.length)} {t.of} {filt.length}</span><div style={{ display: "flex", gap: 5 }}><button className="bt bs bsm" disabled={pgC === 0} onClick={() => setPgC(pgC - 1)}>{t.previous}</button><button className="bt bs bsm" disabled={pgC >= totPg - 1} onClick={() => setPgC(pgC + 1)}>{t.next}</button></div></div> : null}
      </div>
      {selC ? <CDetail client={selC} onClose={() => setSelC(null)} onUpdate={updateClient} lang={lang} /> : null}
      {showImportC ? <ImportModal onImport={handleImport} onClose={() => setShowImportC(false)} existingItems={clients} lang={lang} mode="clients" /> : null}
    </div>
  )
}
