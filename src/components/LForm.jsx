import { useState } from 'react'
import { T } from '../lib/i18n'
import { LSTAGES } from '../lib/constants'
import { uid } from '../lib/helpers'
import Icon from './Icon'

export default function LForm({ lead, onSave, onClose, lang }) {
  const t = T[lang]
  const def = { name: "", email: "", phone: "", stage: "sessionDone", notes: "", source: "studio", date: new Date().toISOString().split("T")[0], contactAttempts: 0, lastActionDate: "", nextCallback: "", address: "", birthDate: "", nif: "", origin: "", followUpStatus: "" }
  const [f, sF] = useState(lead ? { ...def, ...lead } : { ...def })
  const up = (k, v) => sF(p => ({ ...p, [k]: v }))
  const doSave = () => { if (!(f.name || "").trim()) return; onSave({ ...f, id: f.id || uid(), createdAt: f.createdAt || new Date().toISOString().split("T")[0] }) }
  const srcOpts = [["meta_ads", "Meta Ads"], ["website", "Site internet"], ["socialMedia", t.socialMedia], ["studio", "Studio"], ["recommendation", t.recommendation], ["advertising", t.advertising]]
  const fuOpts = [["msgSent", t.msgSent], ["noAnswer", t.noAnswer], ["callBack", t.callBack], ["interested", t.interested], ["notInterested", t.notInterested], ["comingBack", t.comingBack]]
  const stOpts = LSTAGES.map(s => [s, { notContacted: t.notContacted, sessionBooked: t.sessionBooked, sessionDone: t.sessionDone, converted: t.converted, lost: t.lost }[s]])

  return (
    <div className="mo" onClick={onClose}><div className="md fin" onClick={e => e.stopPropagation()}>
      <div className="mh"><h3>{lead ? t.editTrial : t.addTrial}</h3><button className="bg0" onClick={onClose}><Icon n="x" s={15} /></button></div>
      <div className="mb">
        <div className="dst" style={{ marginBottom: 8 }}>{t.contactInfo}</div>
        <div className="fg2">
          <div className="fg"><label className="fl">{t.name} *</label><input className="fi" value={f.name || ""} onChange={e => up("name", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.email}</label><input className="fi" value={f.email || ""} onChange={e => up("email", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.phone}</label><input className="fi" value={f.phone || ""} onChange={e => up("phone", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.trialDate}</label><input className="fi" type="date" value={f.date || ""} onChange={e => up("date", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.source}</label><select className="fsl" value={f.source || ""} onChange={e => up("source", e.target.value)}><option value="">&mdash;</option>{srcOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="fg"><label className="fl">{t.leadStatus}</label><select className="fsl" value={f.stage || ""} onChange={e => up("stage", e.target.value)}>{stOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div className="dst" style={{ marginTop: 14, marginBottom: 8 }}>{t.editTrial} (Google Forms)</div>
        <div className="fg2">
          <div className="fg"><label className="fl">{t.address}</label><input className="fi" value={f.address || ""} onChange={e => up("address", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.birthDate}</label><input className="fi" type="date" value={f.birthDate || ""} onChange={e => up("birthDate", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.nif}</label><input className="fi" value={f.nif || ""} onChange={e => up("nif", e.target.value)} /></div>
          <div className="fg"><label className="fl">{t.origin}</label><input className="fi" value={f.origin || ""} onChange={e => up("origin", e.target.value)} /></div>
        </div>
        <div className="dst" style={{ marginTop: 14, marginBottom: 8 }}>{t.followUp}</div>
        <div className="fg2">
          <div className="fg"><label className="fl">{t.followUp}</label><select className="fsl" value={f.followUpStatus || ""} onChange={e => { up("followUpStatus", e.target.value); up("lastActionDate", new Date().toISOString().split("T")[0]) }}><option value="">&mdash;</option>{fuOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="fg"><label className="fl">{t.nextCallback}</label><input className="fi" type="date" value={f.nextCallback || ""} onChange={e => up("nextCallback", e.target.value)} /></div>
        </div>
        <div className="fg" style={{ marginTop: 8 }}><label className="fl">{t.notes}</label><textarea className="fta" value={f.notes || ""} onChange={e => up("notes", e.target.value)} /></div>
      </div>
      <div className="mf"><button className="bt bs" onClick={onClose}>{t.cancel}</button><button className="bt bp" onClick={doSave}><Icon n="check" s={13} />{t.save}</button></div>
    </div></div>
  )
}
