import { useState } from 'react'
import * as XLSX from 'xlsx'
import { T } from '../lib/i18n'
import { SUB } from '../lib/constants'
import { uid } from '../lib/helpers'
import Icon from './Icon'

const FIELD_MAP = {
  name: ["nom", "nome", "name", "apelido", "nome / apelido"],
  status: ["ativo", "status", "estado", "estatus", "actif"],
  gender: ["sexo", "género", "gender", "genre"],
  phone: ["telemóvel", "telemovel", "phone", "contacto", "telefone", "telemóvel / phone number"],
  email: ["e-mail", "email", "mail", "adresse e-mail"],
  startDate: ["data de início", "data de inicio", "start", "início", "inicio", "date début"],
  endDate: ["data de fim", "end", "fim", "date fin"],
  source: ["origem", "source", "origin"],
  sub: ["tipo de subscrição", "tipo subscrição", "subscription", "abonnement", "type"],
  credits: ["créditos", "creditos", "credits"],
  used: ["créditos utilizados", "creditos utilizados", "used", "utilizados"],
  bonus: ["bonus", "bónus"],
  rem: ["créditos restantes", "creditos restantes", "remaining", "restantes"],
  birthDate: ["data de nascimento", "nascimento", "birth", "naissance", "data de nascimento / birth date"],
  nif: ["nif", "fiscal", "nif / fiscal number"],
  notes: ["notas", "notes", "observações"],
  contraindications: ["contra-indicações", "contraindications", "contraindicações"],
  date: ["horodateur", "date", "data", "data de hoje", "data de hoje / date of today"],
  address: ["morada", "address", "adresse", "endereço"],
  origin: ["origem", "origin", "source", "quais são os seus objetivos / what are your goals"],
  stage: ["estado", "stage", "status", "estatus"],
  followUpStatus: ["estatus", "follow-up", "suivi", "seguimento"],
}

const AUTO_MAP_SUB = { "12 meses": "12m", "12 mois": "12m", "6 meses": "6m", "6 mois": "6m", "3 meses": "3m", "3 mois": "3m", "pack 10": "p10", "pack 15": "p15", "pack 20": "p20", "premium": "premium", "ilimitado": "premium", "illimité": "premium", "unlimited": "premium" }
const AUTO_MAP_STATUS = { "sim": "active", "oui": "active", "yes": "active", "ativo": "active", "actif": "active", "active": "active", "não": "inactive", "non": "inactive", "no": "inactive", "inativo": "inactive", "inactif": "inactive", "inactive": "inactive", "suspenso": "suspended", "suspendu": "suspended", "suspended": "suspended" }
const AUTO_MAP_GENDER = { "homem": "male", "homme": "male", "male": "male", "man": "male", "mulher": "female", "femme": "female", "female": "female", "woman": "female" }
const AUTO_MAP_SOURCE = { "recomendação": "recommendation", "recomendação / recommendation": "recommendation", "recommendation": "recommendation", "recommandation": "recommendation", "redes sociais": "socialMedia", "redes sociais / social media": "socialMedia", "social media": "socialMedia", "réseaux sociaux": "socialMedia", "perquisas internet": "internetSearch", "perquisas internet / internet research": "internetSearch", "perquisas internet/ internet research": "internetSearch", "internet": "internetSearch", "recherche internet": "internetSearch", "estúdio": "studio", "estúdio / studio": "studio", "studio": "studio", "publicidade": "advertising", "publicidade / advertising": "advertising", "advertising": "advertising", "publicité": "advertising", "cliente antiga": "oldClient", "old client": "oldClient", "ancien client": "oldClient" }

const IMPORT_MODES = {
  clients: {
    fields: ["name", "status", "gender", "phone", "email", "startDate", "endDate", "source", "sub", "credits", "used", "bonus", "rem", "birthDate", "nif", "notes", "contraindications"],
    buildRow: (get, parseD) => {
      const statusRaw = get("status").toLowerCase(); const genderRaw = get("gender").toLowerCase()
      const sourceRaw = get("source").toLowerCase(); const subRaw = get("sub").toLowerCase()
      return { id: uid(), name: get("name"), status: AUTO_MAP_STATUS[statusRaw] || "active", gender: AUTO_MAP_GENDER[genderRaw] || "female",
        phone: get("phone").replace(/[='"]/g, ""), email: get("email").replace(/\s/g, ""),
        startDate: parseD("startDate"), endDate: parseD("endDate"), source: AUTO_MAP_SOURCE[sourceRaw] || "",
        sub: AUTO_MAP_SUB[subRaw] || "12m", credits: parseInt(get("credits")) || SUB[AUTO_MAP_SUB[subRaw] || "12m"]?.cr || 48,
        used: parseInt(get("used")) || 0, bonus: parseInt(get("bonus")) || 0, rem: parseInt(get("rem")) || 0,
        birthDate: parseD("birthDate"), nif: get("nif"), notes: get("notes"), contraindications: get("contraindications"),
        medicalNotes: "", sessions: [], suspensionHistory: [], renewalHistory: [] }
    },
    previewCols: ["name", "status", "phone", "email", "sub", "rem"],
    postProcess: r => { if (!r.rem) r.rem = r.credits - r.used + r.bonus; return r },
  },
  leads: {
    fields: ["name", "phone", "email", "date", "notes", "stage"],
    buildRow: (get, parseD) => ({ id: uid(), name: get("name"), phone: get("phone").replace(/[='"]/g, ""),
      email: get("email").replace(/\s/g, ""), date: parseD("date") || "",
      notes: get("notes"), stage: "notContacted", source: "meta_ads", contactAttempts: 0,
      createdAt: parseD("date") || "",
      lastActionDate: "", nextCallback: "", address: "", birthDate: "", nif: "", origin: "Meta Ads", followUpStatus: "" }),
    previewCols: ["name", "phone", "email", "date", "notes"],
    postProcess: r => r,
  },
  trials: {
    fields: ["name", "phone", "email", "date", "address", "birthDate", "nif", "origin", "notes", "followUpStatus"],
    buildRow: (get, parseD) => ({ id: uid(), name: get("name"), phone: get("phone").replace(/[='"]/g, ""),
      email: get("email").replace(/\s/g, ""), date: parseD("date") || "",
      address: get("address"), birthDate: parseD("birthDate"), nif: get("nif"),
      origin: get("origin"), notes: get("notes"), followUpStatus: get("followUpStatus") || "",
      stage: "sessionDone", source: "studio", contactAttempts: 0,
      createdAt: parseD("date") || "",
      lastActionDate: "", nextCallback: "" }),
    previewCols: ["name", "phone", "email", "address", "birthDate", "notes"],
    postProcess: r => r,
  },
}

function parseDate(v) {
  if (!v) return ""
  if (v instanceof Date && !isNaN(v)) return v.toISOString().split("T")[0]
  if (typeof v === "number") { const d = new Date((v - 25569) * 86400000); if (!isNaN(d)) return d.toISOString().split("T")[0] }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  const dts = s.match(/^\w{3} (\w{3}) (\d{1,2}) (\d{4})/)
  if (dts) { const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" }; const [, mo, day, yr] = dts; if (months[mo]) return `${yr}-${months[mo]}-${day.padStart(2, "0")}` }
  const parts = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (parts) { const [, a, b, y] = parts; const n1 = parseInt(a), n2 = parseInt(b); if (n1 > 12) return `${y}-${String(n2).padStart(2, "0")}-${String(n1).padStart(2, "0")}`; return `${y}-${String(n1).padStart(2, "0")}-${String(n2).padStart(2, "0")}` }
  return ""
}

export default function ImportModal({ onImport, onClose, existingItems, lang, mode = "clients" }) {
  const t = T[lang]
  const cfg = IMPORT_MODES[mode]
  const [step, sStep] = useState(1)
  const [rawData, sRaw] = useState(null)
  const [headers, sHeaders] = useState([])
  const [mapping, sMapping] = useState({})
  const [parsed, sParsed] = useState([])
  const [issues, sIssues] = useState([])
  const [dupes, sDupes] = useState([])
  const [dupeActions, sDupeAct] = useState({})
  const [fileName, sFN] = useState("")

  const fieldLabels = { name: t.name, status: t.status, gender: t.gender, phone: t.phone, email: t.email, startDate: t.startDate, endDate: t.endDate, source: t.source, sub: t.subscriptionType, credits: t.credits, used: t.creditsUsed, bonus: t.bonus, rem: t.creditsRemaining, birthDate: t.birthDate, nif: t.nif, notes: t.notes, contraindications: t.contraindications, date: t.trialDate, address: t.address, origin: t.origin, stage: t.leadStatus, followUpStatus: t.followUp }

  const handleFile = async (file) => {
    sFN(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array", cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" })
      if (!json.length) return
      const hdrs = Object.keys(json[0])
      sHeaders(hdrs)
      sRaw(json)
      const autoMap = {}
      cfg.fields.forEach(field => {
        const candidates = FIELD_MAP[field] || []
        const matches = hdrs.filter(h => candidates.includes(h.toLowerCase().trim()))
        if (matches.length === 1) { autoMap[field] = matches[0] }
        else if (matches.length > 1) {
          let best = matches[0], bestCount = 0
          matches.forEach(h => { const count = json.filter(r => r[h] != null && String(r[h]).trim() !== "").length; if (count > bestCount) { bestCount = count; best = h } })
          autoMap[field] = best
        }
      })
      sMapping(autoMap)
      sStep(2)
    } catch (err) { console.error("Import error:", err) }
  }

  const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) handleFile(f) }
  const onFileInput = (e) => { const f = e.target.files[0]; if (f) handleFile(f) }

  const doParse = () => {
    const rows = []; const iss = []; const dups = []
    const existNames = new Set((existingItems || []).map(c => c.name.toLowerCase().trim()))
    const existPhones = new Set((existingItems || []).map(c => (c.phone || "").replace(/\D/g, "")).filter(Boolean))

    rawData.forEach((row, idx) => {
      const get = field => mapping[field] ? String(row[mapping[field]] || "").trim() : ""
      const name = get("name")
      if (!name) { iss.push({ row: idx + 2, field: "name", msg: t.missingName }); return }
      const email = get("email").replace(/\s/g, "")
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) iss.push({ row: idx + 2, field: "email", msg: `${t.invalidEmail}: ${email}` })
      const parseDateField = field => { const raw = mapping[field] ? row[mapping[field]] : null; return parseDate(raw) }
      const item = cfg.buildRow(get, parseDateField)
      cfg.postProcess(item)
      const nameKey = name.toLowerCase().trim()
      const phone = (item.phone || "").replace(/\D/g, "")
      const isDupe = (existNames.has(nameKey)) || (phone.length > 5 && existPhones.has(phone))
      if (isDupe) {
        const existing = (existingItems || []).find(c => c.name.toLowerCase().trim() === nameKey || (phone.length > 5 && (c.phone || "").replace(/\D/g, "") === phone))
        dups.push({ row: idx + 2, client: item, existingName: existing?.name || name, existingId: existing?.id })
      }
      rows.push({ ...item, _isDupe: isDupe, _row: idx + 2 })
    })

    sParsed(rows); sIssues(iss); sDupes(dups)
    const defActions = {}; dups.forEach(d => { defActions[d.row] = "skip" }); sDupeAct(defActions)
    sStep(3)
  }

  const doImport = () => {
    const dupeOverwrites = parsed.filter(r => r._isDupe && dupeActions[r._row] === "overwrite")
    const dupeMerges = parsed.filter(r => r._isDupe && dupeActions[r._row] === "merge")
    const newClients = parsed.filter(r => !r._isDupe)
    const clean = c2 => { const { _isDupe: _a, _row: _b, ...rest2 } = c2; return rest2 }

    onImport({
      newClients: newClients.map(clean),
      overwrites: dupeOverwrites.map(c2 => { const cl = clean(c2); const dupMatch = dupes.find(dd => dd.row === c2._row); return { ...cl, id: dupMatch?.existingId || cl.id } }),
      merges: dupeMerges.map(c2 => { const cl2 = clean(c2); const dupMatch2 = dupes.find(dd => dd.row === c2._row); return { ...cl2, id: dupMatch2?.existingId || cl2.id } }),
    })
  }

  const nonDupeCount = parsed.filter(r => !r._isDupe).length
  const importableCount = nonDupeCount + dupes.filter(d => dupeActions[d.row] !== "skip").length

  return (
    <div className="mo" onClick={onClose}><div className="md fin" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
      <div className="mh"><h3><Icon n="upload" s={16} /> {t.importExcel}</h3><button className="bg0" onClick={onClose}><Icon n="x" s={15} /></button></div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--bd)" }}>
        {[{ n: 1, l: t.importStep1 }, { n: 2, l: t.importStep2 }, { n: 3, l: t.importStep3 }].map(s =>
          <div key={s.n} style={{ flex: 1, padding: "8px 0", textAlign: "center", fontSize: 10, fontWeight: 600, color: step >= s.n ? "var(--ac2)" : "var(--t2)", borderBottom: step === s.n ? "2px solid var(--ac)" : "2px solid transparent" }}>{s.l}</div>
        )}
      </div>

      <div className="mb">
        {step === 1 && <div>
          <div onDrop={onDrop} onDragOver={e => e.preventDefault()} style={{ border: "2px dashed var(--bd)", borderRadius: "var(--r)", padding: 40, textAlign: "center", cursor: "pointer", transition: "all .15s" }} onClick={() => document.getElementById("import-file-input").click()}>
            <Icon n="upload" s={32} /><p style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>{t.selectFile}</p>
            <p style={{ fontSize: 10, color: "var(--t2)", marginTop: 4 }}>{t.dragDrop}</p>
            <input id="import-file-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFileInput} />
          </div>
          {fileName && <p style={{ marginTop: 8, fontSize: 11, color: "var(--ac2)" }}>{fileName}</p>}
        </div>}

        {step === 2 && <div>
          <p style={{ fontSize: 12, marginBottom: 12, color: "var(--t1)" }}>{rawData?.length} {t.entries} — {headers.length} colonnes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cfg.fields.map(field => <div key={field} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 120, color: "var(--t0)" }}>{fieldLabels[field] || field}</span>
              <span style={{ color: "var(--t2)", fontSize: 10 }}>&larr;</span>
              <select className="fsl" style={{ flex: 1, fontSize: 10, padding: "4px 8px" }} value={mapping[field] || ""} onChange={e => sMapping(p => ({ ...p, [field]: e.target.value || undefined }))}>
                <option value="">&mdash; {t.ignore} &mdash;</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {mapping[field] && <span style={{ fontSize: 9, color: "var(--ok)" }}>&check;</span>}
            </div>)}
          </div>
          <div className="mf" style={{ padding: "12px 0", borderTop: "none" }}><button className="bt bs" onClick={() => sStep(1)}>{t.previous}</button><button className="bt bp" onClick={doParse} disabled={!mapping.name}>{t.preview} &rarr;</button></div>
        </div>}

        {step === 3 && <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ padding: "6px 12px", background: "var(--okg)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--ok)" }}>{nonDupeCount} {t.rowsToImport}</div>
            {(() => { const withDate = parsed.filter(r => r.date && r.date !== "").length; return withDate > 0 ? <div style={{ padding: "6px 12px", background: "var(--infg)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--inf)" }}>{withDate} dates</div> : null })()}
            {dupes.length > 0 && <div style={{ padding: "6px 12px", background: "var(--wrg)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--wr)" }}>{dupes.length} {t.duplicatesFound}</div>}
            {issues.length > 0 && <div style={{ padding: "6px 12px", background: "var(--erg)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--er)" }}>{issues.length} {t.dataIssues}</div>}
          </div>

          {issues.length > 0 && <div style={{ marginBottom: 12, padding: 10, background: "var(--b1)", borderRadius: 6, maxHeight: 120, overflowY: "auto" }}>
            <div className="dst" style={{ marginBottom: 4 }}><Icon n="alert" s={10} /> {t.dataIssues}</div>
            {issues.slice(0, 20).map((is, i) => <div key={i} style={{ fontSize: 9, color: "var(--er)", padding: "2px 0" }}>Ligne {is.row}: {is.msg}</div>)}
          </div>}

          {dupes.length > 0 && <div style={{ marginBottom: 12, padding: 10, background: "var(--b1)", borderRadius: 6, maxHeight: 200, overflowY: "auto" }}>
            <div className="dst" style={{ marginBottom: 6 }}>{t.duplicatesFound}</div>
            {dupes.map(d => <div key={d.row} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid var(--bd)", fontSize: 10 }}>
              <span style={{ fontWeight: 600, minWidth: 140 }}>{d.client.name}</span>
              <span style={{ color: "var(--wr)", fontSize: 9 }}>&asymp; {d.existingName}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                {[{ k: "skip", l: t.duplicateSkip, c: "bs" }, { k: "overwrite", l: t.duplicateOverwrite, c: "bs" }, { k: "merge", l: t.duplicateMerge, c: "bs" }].map(a =>
                  <button key={a.k} className={`bt bsm ${dupeActions[d.row] === a.k ? "bp" : a.c}`} onClick={() => sDupeAct(p => ({ ...p, [d.row]: a.k }))}>{a.l}</button>
                )}
              </div>
            </div>)}
          </div>}

          <div style={{ overflowX: "auto", maxHeight: 250, border: "1px solid var(--bd)", borderRadius: 6 }}>
            <table><thead><tr><th style={{ fontSize: 8 }}>#</th>{cfg.previewCols.map(col => <th key={col} style={{ fontSize: 8 }}>{fieldLabels[col] || col}</th>)}</tr></thead><tbody>
              {parsed.slice(0, 15).map((r, i) => <tr key={i} style={{ opacity: r._isDupe && dupeActions[r._row] === "skip" ? 0.3 : 1 }}>
                <td style={{ fontSize: 9, color: "var(--t2)" }}>{r._row}</td>
                {cfg.previewCols.map(col => <td key={col} style={{ fontSize: 9 }}>{col === "status" ? <span className={`bg bg-${r.status}`} style={{ fontSize: 8 }}>{t[r.status] || r.status}</span> : String(r[col] || "\u2014").substring(0, 30)}{col === "name" && r._isDupe && <span style={{ color: "var(--wr)", fontSize: 8, marginLeft: 4 }}>&starf;</span>}</td>)}
              </tr>)}
              {parsed.length > 15 && <tr><td colSpan={cfg.previewCols.length + 1} style={{ textAlign: "center", fontSize: 9, color: "var(--t2)", padding: 6 }}>+{parsed.length - 15} ...</td></tr>}
            </tbody></table>
          </div>

          <div className="mf" style={{ padding: "12px 0", borderTop: "none" }}><button className="bt bs" onClick={() => sStep(2)}>{t.previous}</button><button className="bt bp" onClick={doImport} disabled={importableCount === 0}><Icon n="check" s={13} /> {t.importBtn} ({importableCount})</button></div>
        </div>}
      </div>
    </div></div>
  )
}
