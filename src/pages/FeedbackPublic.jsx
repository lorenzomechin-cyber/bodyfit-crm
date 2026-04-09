import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TXT = {
  pt: {
    title: 'Check-in Semanal',
    sub: 'BodyFit Campo de Ourique',
    identify: 'Insira o seu telefone para aceder ao seu check-in.',
    phone: 'Telefone', go: 'Continuar', loading: 'A carregar...',
    notFound: 'Nenhum perfil encontrado com este telefone.',
    weekLabel: 'Semana',
    weight: 'Peso atual (kg)', waist: 'Tour de taille (cm)',
    energy: 'Energia (1-5)', hunger: 'Fome (1-5)', mood: 'Humor (1-5)',
    adherence: 'Aderencia ao plano (%)', sleepHours: 'Horas de sono', waterLiters: 'Agua (litros)',
    notes: 'Notas / Como se sentiu esta semana',
    notesPlaceholder: 'Dificuldades, progressos, observacoes...',
    submit: 'Enviar check-in', sending: 'A enviar...',
    successTitle: 'Check-in enviado!',
    successText: 'Obrigado pelo seu feedback semanal. Continue assim!',
    errorGeneric: 'Erro ao enviar. Tente novamente.',
    history: 'Historico',
    newCheckin: 'Novo check-in',
    noHistory: 'Nenhum check-in anterior.',
    week: 'Sem',
  },
  fr: {
    title: 'Check-in Hebdomadaire',
    sub: 'BodyFit Campo de Ourique',
    identify: 'Entrez votre telephone pour acceder a votre check-in.',
    phone: 'Telephone', go: 'Continuer', loading: 'Chargement...',
    notFound: 'Aucun profil trouve avec ce telephone.',
    weekLabel: 'Semaine',
    weight: 'Poids actuel (kg)', waist: 'Tour de taille (cm)',
    energy: 'Energie (1-5)', hunger: 'Faim (1-5)', mood: 'Humeur (1-5)',
    adherence: 'Adherence au programme (%)', sleepHours: 'Heures de sommeil', waterLiters: 'Eau (litres)',
    notes: 'Notes / Comment vous etes-vous senti cette semaine',
    notesPlaceholder: 'Difficultes, progres, observations...',
    submit: 'Envoyer check-in', sending: 'Envoi...',
    successTitle: 'Check-in envoye !',
    successText: 'Merci pour votre feedback hebdomadaire. Continuez comme ca !',
    errorGeneric: "Erreur lors de l'envoi. Reessayez.",
    history: 'Historique',
    newCheckin: 'Nouveau check-in',
    noHistory: 'Aucun check-in precedent.',
    week: 'Sem',
  },
  en: {
    title: 'Weekly Check-in',
    sub: 'BodyFit Campo de Ourique',
    identify: 'Enter your phone number to access your check-in.',
    phone: 'Phone', go: 'Continue', loading: 'Loading...',
    notFound: 'No profile found with this phone number.',
    weekLabel: 'Week',
    weight: 'Current weight (kg)', waist: 'Waist (cm)',
    energy: 'Energy (1-5)', hunger: 'Hunger (1-5)', mood: 'Mood (1-5)',
    adherence: 'Plan adherence (%)', sleepHours: 'Hours of sleep', waterLiters: 'Water (liters)',
    notes: 'Notes / How did you feel this week',
    notesPlaceholder: 'Difficulties, progress, observations...',
    submit: 'Submit check-in', sending: 'Sending...',
    successTitle: 'Check-in submitted!',
    successText: 'Thank you for your weekly feedback. Keep it up!',
    errorGeneric: 'Error submitting. Please try again.',
    history: 'History',
    newCheckin: 'New check-in',
    noHistory: 'No previous check-ins.',
    week: 'Wk',
  }
}

function ScoreInput({ label, value, onChange, max = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</label>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              fontFamily: "'JetBrains Mono',monospace",
              borderColor: value === n ? 'var(--ac)' : 'var(--bd)',
              background: value === n ? 'var(--ac)' : 'var(--b2)',
              color: value === n ? '#fff' : 'var(--t0)'
            }}>{n}</button>
        ))}
      </div>
    </div>
  )
}

export default function FeedbackPublic() {
  const [lang, setLang] = useState('pt')
  const [step, setStep] = useState('identify') // identify | form | history | done
  const [phone, setPhone] = useState('')
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ weight: '', waist: '', energy: 0, hunger: 0, mood: 0, adherence: '', sleep_hours: '', water_liters: '', notes: '' })

  const t = TXT[lang]
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const saved = localStorage.getItem('bodyfit_feedback_phone')
    if (saved) { setPhone(saved); identify(saved) }
  }, [])

  async function identify(ph) {
    const clean = (ph || phone).trim().replace(/[\s\-()]/g, '')
    if (!clean) return
    setLoading(true); setError('')
    try {
      const { data } = await supabase.from('nutrition_profiles').select('*').eq('phone', clean).order('created_at', { ascending: false }).limit(1)
      if (data && data.length > 0) {
        setProfile(data[0])
        if (data[0].language) setLang(data[0].language)
        localStorage.setItem('bodyfit_feedback_phone', clean)
        // Load history
        const { data: fb } = await supabase.from('weekly_feedbacks').select('*').eq('client_id', data[0].id).order('created_at', { ascending: false })
        setHistory(fb || [])
        setStep('form')
      } else {
        setError(t.notFound)
      }
    } catch { setError(t.errorGeneric) }
    finally { setLoading(false) }
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const weekNum = history.length + 1
      const row = {
        client_id: profile.id,
        phone: phone.trim().replace(/[\s\-()]/g, ''),
        week_number: weekNum,
        weight: form.weight ? parseFloat(form.weight) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        energy: form.energy || null,
        hunger: form.hunger || null,
        mood: form.mood || null,
        adherence: form.adherence ? parseInt(form.adherence) : null,
        sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
        water_liters: form.water_liters ? parseFloat(form.water_liters) : null,
        notes: form.notes || null
      }
      const { error: err } = await supabase.from('weekly_feedbacks').insert(row)
      if (err) { setError(t.errorGeneric); console.error(err) }
      else setStep('done')
    } catch { setError(t.errorGeneric) }
    finally { setLoading(false) }
  }

  // Identify screen
  if (step === 'identify') return (
    <div className="bk-page"><div className="bk-card bk-in" style={{ textAlign: 'center', maxWidth: 420 }}>
      <div className="bk-logo">BODY<em>FIT</em></div>
      <div className="bk-sub">{t.sub}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 16 }}>
        {['pt', 'fr', 'en'].map(x => (
          <button key={x} onClick={() => setLang(x)}
            style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid', fontSize: 9, fontWeight: 600, cursor: 'pointer',
              borderColor: lang === x ? 'var(--ac)' : 'var(--bd)',
              background: lang === x ? 'var(--ac)' : 'none',
              color: lang === x ? '#fff' : 'var(--t1)'
            }}>{x.toUpperCase()}</button>
        ))}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t.title}</h2>
      <p style={{ fontSize: 11, color: 'var(--t1)', marginBottom: 16 }}>{t.identify}</p>
      {error && <div style={{ background: 'var(--erg)', color: 'var(--er)', padding: 8, borderRadius: 6, fontSize: 11, marginBottom: 12 }}>{error}</div>}
      <form onSubmit={e => { e.preventDefault(); identify() }}>
        <input className="fi" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+351 ..."
          style={{ width: '100%', marginBottom: 10, textAlign: 'center' }} />
        <button type="submit" className="bt bp" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? t.loading : t.go}
        </button>
      </form>
    </div></div>
  )

  // Success screen
  if (step === 'done') return (
    <div className="bk-page"><div className="bk-card bk-in" style={{ textAlign: 'center' }}>
      <div className="bk-logo">BODY<em>FIT</em></div>
      <div className="bk-sub">{t.sub}</div>
      <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t.successTitle}</h2>
      <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6 }}>{t.successText}</p>
    </div></div>
  )

  // History view
  if (step === 'history') return (
    <div className="bk-page"><div className="bk-card bk-in" style={{ maxWidth: 500 }}>
      <div className="bk-logo">BODY<em>FIT</em></div>
      <div className="bk-sub">{t.sub}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t.history}</h2>
        <button className="bt bp bsm" onClick={() => setStep('form')}>{t.newCheckin}</button>
      </div>
      {history.length === 0 ? <p style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', padding: 20 }}>{t.noHistory}</p> :
        <div style={{ overflowX: 'auto' }}>
          <table><thead><tr>
            <th>{t.week}</th><th>{t.weight.split(' ')[0]}</th><th>{t.waist.split(' ')[0]}</th>
            <th>E</th><th>F</th><th>H</th><th>%</th>
          </tr></thead><tbody>
            {history.map(fb => <tr key={fb.id}>
              <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{fb.week_number || '-'}</td>
              <td>{fb.weight ? fb.weight + 'kg' : '-'}</td>
              <td>{fb.waist ? fb.waist + 'cm' : '-'}</td>
              <td>{fb.energy ? fb.energy + '/5' : '-'}</td>
              <td>{fb.hunger ? fb.hunger + '/5' : '-'}</td>
              <td>{fb.mood ? fb.mood + '/5' : '-'}</td>
              <td>{fb.adherence ? fb.adherence + '%' : '-'}</td>
            </tr>)}
          </tbody></table>
        </div>
      }
    </div></div>
  )

  // Feedback form
  const weekNum = history.length + 1
  return (
    <div className="bk-page"><div className="bk-card bk-in" style={{ maxWidth: 500 }}>
      <div className="bk-logo">BODY<em>FIT</em></div>
      <div className="bk-sub">{t.sub}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t.title}</h2>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: 'var(--ac)', background: 'var(--acg)', padding: '3px 10px', borderRadius: 10 }}>{t.weekLabel} {weekNum}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--t1)', marginBottom: 16 }}>{profile?.name}</p>

      {history.length > 0 && <button className="bt bs bsm" onClick={() => setStep('history')} style={{ marginBottom: 12 }}>{t.history} ({history.length})</button>}

      {error && <div style={{ background: 'var(--erg)', color: 'var(--er)', padding: 8, borderRadius: 6, fontSize: 11, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.weight}</label>
            <input className="fi" type="number" step="0.1" min="30" max="300" value={form.weight} onChange={e => up('weight', e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.waist}</label>
            <input className="fi" type="number" step="0.1" min="40" max="200" value={form.waist} onChange={e => up('waist', e.target.value)} />
          </div>
        </div>

        <ScoreInput label={t.energy} value={form.energy} onChange={v => up('energy', v)} />
        <ScoreInput label={t.hunger} value={form.hunger} onChange={v => up('hunger', v)} />
        <ScoreInput label={t.mood} value={form.mood} onChange={v => up('mood', v)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.adherence}</label>
            <input className="fi" type="number" min="0" max="100" value={form.adherence} onChange={e => up('adherence', e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.sleepHours}</label>
            <input className="fi" type="number" step="0.5" min="0" max="14" value={form.sleep_hours} onChange={e => up('sleep_hours', e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.waterLiters}</label>
            <input className="fi" type="number" step="0.1" min="0" max="10" value={form.water_liters} onChange={e => up('water_liters', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.notes}</label>
          <textarea className="fta" rows={3} value={form.notes} onChange={e => up('notes', e.target.value)} placeholder={t.notesPlaceholder} />
        </div>

        <button type="button" onClick={handleSubmit} className="bt bp" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
          {loading ? t.sending : t.submit}
        </button>
      </div>
    </div></div>
  )
}
