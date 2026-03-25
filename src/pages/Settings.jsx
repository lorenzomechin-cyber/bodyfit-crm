import { useState } from 'react'
import * as XLSX from 'xlsx'
import { T } from '../lib/i18n'
import Icon from '../components/Icon'

export default function Settings({ lang, sLang, user, config, sConfig, clients, leads, trials, sClients, sLeads, sTrials, onLoad, onReset }) {
  const t = T[lang]
  const [tab, sTab] = useState("general")
  const [newSubKey, setNewSubKey] = useState("")
  const [newSubCr, setNewSubCr] = useState(10)
  const [newSubMo, setNewSubMo] = useState(0)
  const [newSrc, setNewSrc] = useState("")
  const [toast, setToast] = useState("")

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500) }
  function updateThreshold(key, val) { const th = { ...config.thresholds }; th[key] = parseInt(val) || 0; sConfig({ ...config, thresholds: th }) }
  function updateSub(key, field, val) { const subs = { ...config.subs }; subs[key] = { ...subs[key] }; subs[key][field] = parseInt(val) || 0; sConfig({ ...config, subs: subs }) }
  function removeSub(key) { const subs = { ...config.subs }; delete subs[key]; sConfig({ ...config, subs: subs }) }
  function addSub() { if (!newSubKey.trim()) return; const subs = { ...config.subs }; subs[newSubKey.trim()] = newSubMo > 0 ? { cr: newSubCr, mo: newSubMo } : { cr: newSubCr }; sConfig({ ...config, subs: subs }); setNewSubKey(""); setNewSubCr(10); setNewSubMo(0) }
  function addSource() { if (!newSrc.trim() || config.sources.indexOf(newSrc.trim()) !== -1) return; sConfig({ ...config, sources: config.sources.concat([newSrc.trim()]) }); setNewSrc("") }
  function removeSource(s) { sConfig({ ...config, sources: config.sources.filter(x => x !== s) }) }

  function doExport(data, filename, sheetName) { const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName || "Data"); XLSX.writeFile(wb, filename); showToast(t.exportSuccess) }
  function exportClients() { doExport(clients.map(c => ({ Nom: c.name, Status: c.status, Tel: c.phone, Email: c.email, Debut: c.startDate, Fin: c.endDate, Abo: c.sub, Credits: c.credits, Utilises: c.used, Bonus: c.bonus, Restants: c.rem, Naissance: c.birthDate, NIF: c.nif, Notes: c.notes, Contraindications: c.contraindications, Source: c.source, Genre: c.gender, Sessions: (c.sessions || []).length })), "bodyfit_clients.xlsx", "Clients") }
  function exportLeads() { doExport(leads.map(l => ({ Nom: l.name, Email: l.email, Tel: l.phone, Stage: l.stage, Date: l.date, Source: l.source, Notes: l.notes, Tentatives: l.contactAttempts })), "bodyfit_leads.xlsx", "Leads") }
  function exportTrials() { doExport(trials.map(tr => ({ Nom: tr.name, Email: tr.email, Tel: tr.phone, Date: tr.date, Adresse: tr.address, Naissance: tr.birthDate, NIF: tr.nif, Origine: tr.origin, Suivi: tr.followUpStatus, Notes: tr.notes })), "bodyfit_essais.xlsx", "Essais") }
  function exportBackup() { const backup = { version: 3, date: new Date().toISOString(), clients, leads, trials, config }; const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "bodyfit_backup_" + new Date().toISOString().split("T")[0] + ".json"; a.click(); URL.revokeObjectURL(url); showToast(t.backupSuccess) }
  function importBackup(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => { try { const data = JSON.parse(ev.target.result); if (data.clients) sClients(data.clients); if (data.leads) sLeads(data.leads); if (data.trials) sTrials(data.trials); if (data.config) sConfig(data.config); showToast(t.restoreSuccess) } catch (err) { showToast("Erreur: fichier invalide") } }; reader.readAsText(file) }

  const tabItems = [{ k: "general", l: t.settingsGeneral, i: "gear" }, { k: "subs", l: t.settingsSubscriptions, i: "tag" }, { k: "thresholds", l: t.settingsThresholds, i: "activity" }, { k: "export", l: t.settingsExport, i: "dl" }]

  return (
    <div className="fin"><div className="ph"><h2>{t.settings}</h2></div>

      {toast ? <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, background: "var(--ok)", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.12)", animation: "fIn .2s ease" }}>{toast}</div> : null}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {tabItems.map(tb => <button key={tb.k} className={"bt " + (tab === tb.k ? "bp" : "bs")} onClick={() => sTab(tb.k)}><Icon n={tb.i} s={12} />{tb.l}</button>)}
      </div>

      {tab === "general" ? <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
        <div className="cd"><div className="dst">{t.language}</div><div style={{ display: "flex", gap: 5, marginTop: 4 }}>{[{ c: "fr", l: t.french }, { c: "pt", l: t.portuguese }, { c: "en", l: t.english }].map(x => <button key={x.c} className={"bt " + (lang === x.c ? "bp" : "bs")} onClick={() => sLang(x.c)}>{x.l}</button>)}</div></div>
        <div className="cd"><div className="dst">{t.roleLabel}</div><span className="bg bg-ok" style={{ fontSize: 11, padding: "4px 10px" }}>{user.name} &mdash; {t[user.role]}</span></div>
        <div className="cd"><div className="dst">{t.dataLabel}</div><div style={{ display: "flex", gap: 6, marginTop: 6 }}><button className="bt bs" onClick={onLoad}><Icon n="dl" s={13} />{t.loadSampleData}</button><button className="bt bdd" onClick={onReset}><Icon n="trash" s={13} />{t.resetData}</button></div></div>
      </div> : null}

      {tab === "subs" ? <div style={{ maxWidth: 600 }}>
        <div className="cd" style={{ marginBottom: 10 }}>
          <div className="dst">{t.settingsSubscriptions}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.keys(config.subs).map(key => { const s = config.subs[key]; return <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--b0)", borderRadius: 8 }}>
              <span style={{ fontFamily: "var(--fm)", fontSize: 12, fontWeight: 700, minWidth: 50 }}>{key}</span>
              <div className="fg" style={{ flex: 1 }}><label className="fl">{t.subCredits}</label><input className="fi" type="number" min="1" style={{ padding: "4px 8px", fontSize: 11 }} value={s.cr} onChange={e => updateSub(key, "cr", e.target.value)} /></div>
              <div className="fg" style={{ flex: 1 }}><label className="fl">{t.subMonths}</label><input className="fi" type="number" min="0" style={{ padding: "4px 8px", fontSize: 11 }} value={s.mo || 0} onChange={e => updateSub(key, "mo", e.target.value)} /></div>
              <button className="bg0" style={{ color: "var(--er)" }} onClick={() => removeSub(key)}><Icon n="trash" s={13} /></button>
            </div> })}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "flex-end" }}>
            <div className="fg" style={{ flex: 1 }}><label className="fl">{t.subName}</label><input className="fi" style={{ padding: "4px 8px", fontSize: 11 }} placeholder="ex: p30" value={newSubKey} onChange={e => setNewSubKey(e.target.value)} /></div>
            <div className="fg"><label className="fl">{t.subCredits}</label><input className="fi" type="number" min="1" style={{ padding: "4px 8px", fontSize: 11, width: 70 }} value={newSubCr} onChange={e => setNewSubCr(parseInt(e.target.value) || 0)} /></div>
            <div className="fg"><label className="fl">{t.subMonths}</label><input className="fi" type="number" min="0" style={{ padding: "4px 8px", fontSize: 11, width: 70 }} value={newSubMo} onChange={e => setNewSubMo(parseInt(e.target.value) || 0)} /></div>
            <button className="bt bp" onClick={addSub}><Icon n="plus" s={12} />{t.addSub}</button>
          </div>
        </div>
        <div className="cd">
          <div className="dst">{t.sourcesConfig}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {config.sources.map(s => <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "var(--b0)", borderRadius: 14, fontSize: 11, fontWeight: 500 }}>{t[s] || s}<button className="bg0" style={{ color: "var(--er)", padding: 0 }} onClick={() => removeSource(s)}><Icon n="x" s={10} /></button></span>)}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}><input className="fi" style={{ padding: "4px 8px", fontSize: 11, flex: 1 }} placeholder={t.addSource} value={newSrc} onChange={e => setNewSrc(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addSource() }} /><button className="bt bs bsm" onClick={addSource}><Icon n="plus" s={11} /></button></div>
        </div>
      </div> : null}

      {tab === "thresholds" ? <div style={{ maxWidth: 480 }}>
        <div className="cd">
          <div className="dst">{t.settingsThresholds}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="fg"><label className="fl">{t.thresholdLowCredits}</label><div style={{ display: "flex", alignItems: "center", gap: 8 }}><input className="fi" type="number" min="0" max="50" style={{ width: 80, padding: "6px 10px" }} value={config.thresholds.lowCredits} onChange={e => updateThreshold("lowCredits", e.target.value)} /><span style={{ fontSize: 11, color: "var(--t1)" }}>{t.credits}</span></div></div>
            <div className="fg"><label className="fl">{t.thresholdInactiveDays}</label><div style={{ display: "flex", alignItems: "center", gap: 8 }}><input className="fi" type="number" min="1" max="90" style={{ width: 80, padding: "6px 10px" }} value={config.thresholds.inactiveDays} onChange={e => updateThreshold("inactiveDays", e.target.value)} /><span style={{ fontSize: 11, color: "var(--t1)" }}>jours</span></div></div>
            <div className="fg"><label className="fl">{t.thresholdExpiryDays}</label><div style={{ display: "flex", alignItems: "center", gap: 8 }}><input className="fi" type="number" min="7" max="90" style={{ width: 80, padding: "6px 10px" }} value={config.thresholds.expiryDays} onChange={e => updateThreshold("expiryDays", e.target.value)} /><span style={{ fontSize: 11, color: "var(--t1)" }}>jours</span></div></div>
          </div>
        </div>
      </div> : null}

      {tab === "export" ? <div style={{ maxWidth: 520 }}>
        <div className="cd" style={{ marginBottom: 10 }}>
          <div className="dst">Export Excel</div>
          <p style={{ fontSize: 11, color: "var(--t1)", marginBottom: 10 }}>{clients.length} clients, {leads.length} leads, {trials.length} essais</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="bt bs" style={{ justifyContent: "flex-start" }} onClick={exportClients}><Icon n="dl" s={13} />{t.exportAllClients} ({clients.length})</button>
            <button className="bt bs" style={{ justifyContent: "flex-start" }} onClick={exportLeads}><Icon n="dl" s={13} />{t.exportAllLeads} ({leads.length})</button>
            <button className="bt bs" style={{ justifyContent: "flex-start" }} onClick={exportTrials}><Icon n="dl" s={13} />{t.exportAllTrials} ({trials.length})</button>
          </div>
        </div>
        <div className="cd">
          <div className="dst">{t.settingsExport}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="bt bp" style={{ justifyContent: "flex-start" }} onClick={exportBackup}><Icon n="dl" s={13} />{t.exportBackup}</button>
            <div style={{ position: "relative" }}>
              <button className="bt bs" style={{ justifyContent: "flex-start", width: "100%" }} onClick={() => document.getElementById("backup-input").click()}><Icon n="upload" s={13} />{t.importBackup}</button>
              <input id="backup-input" type="file" accept=".json" style={{ display: "none" }} onChange={importBackup} />
            </div>
          </div>
          <p style={{ fontSize: 9, color: "var(--t2)", marginTop: 8 }}>JSON backup &mdash; clients + leads + essais + config</p>
        </div>
      </div> : null}

    </div>
  )
}
