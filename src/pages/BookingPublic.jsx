import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, dbToBooking, dbToClient } from '../lib/supabase'
import { generateSlots } from '../lib/helpers'
import { MAX_MACHINES, CANCEL_CUTOFF_HOURS, SUB } from '../lib/constants'

const todayStr = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0') }
const normalizePhone = (p) => p.trim().replace(/[\s\-().]/g, '')
const fmtDateShort = (d) => { const dt = new Date(d+'T12:00:00'); return dt.toLocaleDateString('pt-PT', { day:'2-digit', month:'short' }) }
const fmtDateFull = (d) => {
  const dt = new Date(d+'T12:00:00')
  const days = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado']
  const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${days[dt.getDay()]}, ${dt.getDate()} de ${months[dt.getMonth()]}`
}
const monthNames = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STUDIO_PHONE = '+351 964 684 718'
const STUDIO_ADDR = 'R. Campo de Ourique 103, Lisboa'

const SUB_LABELS = { '12m':'12 meses','6m':'6 meses','3m':'3 meses','p10':'Pack 10','p15':'Pack 15','p20':'Pack 20','premium':'Premium' }

// ─── Animated number ───
function AnimNum({ value, color }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === display) return
    const diff = value - display
    const step = Math.ceil(Math.abs(diff) / 12)
    const iv = setInterval(() => {
      setDisplay(prev => {
        const next = diff > 0 ? Math.min(prev + step, value) : Math.max(prev - step, value)
        if (next === value) clearInterval(iv)
        return next
      })
    }, 30)
    return () => clearInterval(iv)
  }, [value])
  return <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color }}>{display}</span>
}

// ─── Circular progress ───
function CircleProgress({ value, max, size = 80, color = '#2D8C5A' }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = (size - 8) / 2, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EDEAE4" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  )
}

export default function BookingPublic() {
  const [step, setStep] = useState('identify')
  const [prevStep, setPrevStep] = useState('')
  const [dir, setDir] = useState('right') // animation direction
  const [bookingType, setBookingType] = useState('')
  const [selDate, setSelDate] = useState('')
  const [selSlot, setSelSlot] = useState('')
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [client, setClient] = useState(null) // full client record
  const [allBookings, setAllBookings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })
  const [dashTab, setDashTab] = useState('overview') // overview | history
  const [showAllHistory, setShowAllHistory] = useState(false)

  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t) } }, [error])

  const go = useCallback((next, direction) => {
    setDir(direction || 'right')
    setPrevStep(step)
    setStep(next)
  }, [step])

  async function loadBookings(ph) {
    const p = ph || phone
    const all = await supabase.from('bookings').select('*').in('status', ['confirmed','completed'])
    setAllBookings((all.data || []).map(dbToBooking))
    if (p) {
      const my = await supabase.from('bookings').select('*').eq('client_phone', p)
      setMyBookings((my.data || []).map(dbToBooking).sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot)))
    }
  }

  async function handleIdentify(e) {
    e.preventDefault()
    const normalized = normalizePhone(phone)
    if (!normalized) return
    setPhone(normalized); setLoading(true); setError('')
    try {
      let data = null
      const attempts = [normalized]
      if (!normalized.startsWith('+351')) attempts.push('+351' + normalized.replace(/^0+/, ''))
      if (normalized.startsWith('+351')) attempts.push(normalized.replace(/^\+351/, ''))
      for (const a of attempts) {
        const r = await supabase.from('clients').select('*').eq('phone', a).single()
        if (r.data) { data = dbToClient(r.data); break }
      }
      if (data) {
        setClient(data); setPhone(data.phone); setGuestName(data.name)
        await loadBookings(data.phone)
        go('dashboard')
      } else {
        setClient(null)
        await loadBookings(normalized)
        go('guest')
      }
    } catch { setError('Erro de conexao.') }
    finally { setLoading(false) }
  }

  async function handleConfirm() {
    const trimName = client ? client.name : guestName.trim()
    const trimPhone = normalizePhone(phone)
    if (!trimName || !trimPhone) { setError('Preencha nome e telefone.'); return }
    setLoading(true); setError('')
    try {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
      const ts = new Date().toISOString()
      const { error: err } = await supabase.from('bookings').insert({
        id, client_id: client?.id || '', client_name: trimName, client_phone: trimPhone,
        date: selDate, time_slot: selSlot, type: bookingType, status: 'confirmed',
        notes: !client ? 'Novo prospecto' : '', created_at: ts, updated_at: ts
      })
      if (err) { setError('Erro ao reservar.') }
      else { await loadBookings(trimPhone); go('success') }
    } catch { setError('Erro de conexao.') }
    finally { setLoading(false) }
  }

  async function handleCancel(bk) {
    const st = new Date(bk.date + 'T' + bk.timeSlot + ':00')
    if (st - new Date() <= CANCEL_CUTOFF_HOURS * 3600000) { setError('Cancelamento impossivel a menos de 2h.'); return }
    setLoading(true)
    await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bk.id)
    await loadBookings(phone); setLoading(false)
  }

  // Calendar
  const today = todayStr()
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)
  const firstDay = new Date(calMonth.y, calMonth.m, 1)
  const lastDay = new Date(calMonth.y, calMonth.m + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const calDays = useMemo(() => {
    const d = []
    for (let i = 0; i < startPad; i++) d.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) d.push(i)
    return d
  }, [calMonth, startPad, lastDay])
  const dayDateStr = (day) => calMonth.y + '-' + String(calMonth.m+1).padStart(2,'0') + '-' + String(day).padStart(2,'0')
  const isDayOff = (day) => { if (!day) return true; const ds = dayDateStr(day); const dt = new Date(ds+'T12:00:00'); return dt.getDay()===0 || ds < today || dt > maxDate }

  // Slots
  const slotsForDate = selDate ? generateSlots(selDate) : []
  const bookingsForDate = allBookings.filter(b => b.date === selDate)
  const now = new Date()
  const availableSlots = slotsForDate.filter(slot => {
    const count = bookingsForDate.filter(b => b.timeSlot === slot).length
    if (count >= MAX_MACHINES) return false
    if (selDate === today) { const [h, m] = slot.split(':').map(Number); const s = new Date(); s.setHours(h, m, 0, 0); if (s <= now) return false }
    return true
  })
  const slotGroups = useMemo(() => {
    const m = [], a = [], e = []
    availableSlots.forEach(s => { const h = parseInt(s); if (h < 12) m.push(s); else if (h < 17) a.push(s); else e.push(s) })
    return [{ k: 'manha', l: 'Manha', s: m }, { k: 'tarde', l: 'Tarde', s: a }, { k: 'noite', l: 'Noite', s: e }].filter(g => g.s.length > 0)
  }, [availableSlots])

  // Client stats
  const upcoming = myBookings.filter(b => b.status === 'confirmed' && b.date >= today).sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot))
  const past = myBookings.filter(b => b.status !== 'confirmed' || b.date < today)
  const nextSession = upcoming[0]

  const creditsUsed = client?.used || 0
  const creditsTotal = client?.credits || 0
  const creditsRem = client?.rem ?? (creditsTotal - creditsUsed)
  const subLabel = client?.sub ? (SUB_LABELS[client.sub] || client.sub) : null

  // ─── STYLES ───
  const C = { bg: '#F5F3EF', bg2: '#EDEAE4', white: '#FFFFFF', dark: '#1A1714', t1: '#6B6560', t2: '#9C958E', bd: '#DED9D0', ok: '#2D8C5A', wr: '#C47F17', er: '#C0392B', inf: '#2E6DA4' }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.dark, overflowX: 'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ background: C.dark, padding: step === 'identify' ? '48px 16px 40px' : '20px 16px 16px', textAlign: 'center', transition: 'padding .4s ease' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: step === 'identify' ? 28 : 18, fontWeight: 700, color: '#fff', letterSpacing: 1, transition: 'font-size .4s ease' }}>
          BODY<span style={{ opacity: 0.6 }}>FIT</span>
        </div>
        {step === 'identify' && <div style={{ fontSize: 10, color: C.t2, letterSpacing: 3, textTransform: 'uppercase', marginTop: 6 }}>EMS Studio &middot; Campo de Ourique</div>}
      </div>

      {/* ── NAV ── */}
      {!['identify','dashboard','guest','success'].includes(step) && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 48, background: C.white, borderBottom: '1px solid ' + C.bd, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => go(step === 'services' ? (client ? 'dashboard' : 'guest') : step === 'calendar' ? 'services' : step === 'slots' ? 'calendar' : step === 'info' ? 'slots' : 'info', 'left')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.dark, padding: '4px 12px 4px 0', fontFamily: 'inherit' }}>&larr;</button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
            {{ services:'Servicos', calendar:'Data', slots:'Horario', info:'Dados', confirm:'Confirmar' }[step]}
          </div>
          {/* Progress bar */}
          <div style={{ width: 80, height: 3, background: C.bg2, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: C.dark, borderRadius: 2, transition: 'width .4s ease',
              width: { services:'20%', calendar:'40%', slots:'60%', info:'80%', confirm:'100%' }[step] }} />
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        {error && (
          <div style={{ background: 'rgba(192,57,43,.08)', color: C.er, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginTop: 16, border: '1px solid rgba(192,57,43,.12)', animation: 'shake .3s ease' }}>
            {error}
          </div>
        )}

        {/* ══════ IDENTIFY ══════ */}
        {step === 'identify' && (
          <form onSubmit={handleIdentify} style={{ paddingTop: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Bem-vindo</div>
              <div style={{ fontSize: 13, color: C.t1 }}>Introduza o seu numero para comecar</div>
            </div>
            <div style={{ background: C.white, borderRadius: 16, padding: 20, border: '1px solid ' + C.bd }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>Telefone</label>
              <input type="tel" placeholder="+351 9XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} autoFocus
                style={{ width: '100%', padding: '14px 0', border: 'none', borderBottom: '2px solid ' + C.bd, fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, outline: 'none', background: 'transparent', color: C.dark, boxSizing: 'border-box', transition: 'border-color .2s', textAlign: 'center', letterSpacing: 2 }}
                onFocus={e => e.target.style.borderBottomColor = C.dark}
                onBlur={e => e.target.style.borderBottomColor = C.bd} />
            </div>
            <button type="submit" disabled={loading || !phone.trim()}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 16, opacity: (!phone.trim() || loading) ? 0.35 : 1, transition: 'all .2s' }}>
              {loading ? 'A verificar...' : 'Continuar'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: C.t2 }}>
              Novo cliente? Insira qualquer numero para marcar uma sessao de teste.
            </div>
          </form>
        )}

        {/* ══════ GUEST (new user) ══════ */}
        {step === 'guest' && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>👋</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Bem-vindo!</div>
              <div style={{ fontSize: 13, color: C.t1 }}>Parece que e novo por aqui. Marque a sua primeira sessao gratuita.</div>
            </div>
            <div style={{ background: C.white, borderRadius: 16, padding: 20, border: '1px solid ' + C.bd, marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>O seu nome</label>
              <input type="text" placeholder="Nome completo" value={guestName} onChange={e => setGuestName(e.target.value)} autoFocus
                style={{ width: '100%', padding: '12px 0', border: 'none', borderBottom: '2px solid ' + C.bd, fontSize: 16, fontWeight: 500, outline: 'none', background: 'transparent', color: C.dark, boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderBottomColor = C.dark}
                onBlur={e => e.target.style.borderBottomColor = C.bd} />
            </div>
            <button disabled={!guestName.trim()} onClick={() => { setBookingType('trial'); go('calendar') }}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !guestName.trim() ? 0.35 : 1, transition: 'opacity .2s' }}>
              Marcar sessao experimental gratuita
            </button>
            <button onClick={() => { setPhone(''); go('identify', 'left') }}
              style={{ width: '100%', marginTop: 10, padding: 12, background: 'transparent', color: C.t2, border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
              Alterar numero
            </button>
          </div>
        )}

        {/* ══════ CLIENT DASHBOARD ══════ */}
        {step === 'dashboard' && client && (
          <div style={{ paddingTop: 20 }}>
            {/* Welcome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {client.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Ola, {client.name?.split(' ')[0]}</div>
                <div style={{ fontSize: 12, color: C.t2 }}>{subLabel || 'Cliente'}</div>
              </div>
              <button onClick={() => { setClient(null); setPhone(''); go('identify', 'left') }}
                style={{ background: 'none', border: '1px solid ' + C.bd, borderRadius: 8, padding: '6px 10px', fontSize: 10, color: C.t2, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sair
              </button>
            </div>

            {/* Next session banner */}
            {nextSession && (
              <div style={{ background: C.dark, borderRadius: 16, padding: '18px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Proxima sessao</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{fmtDateFull(nextSession.date)}</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: '#fff' }}>{nextSession.timeSlot}</div>
              </div>
            )}

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: C.white, borderRadius: 16, padding: 18, border: '1px solid ' + C.bd, textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                  <CircleProgress value={creditsRem} max={creditsTotal} size={72} color={creditsRem <= 3 ? C.er : C.ok} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimNum value={creditsRem} color={creditsRem <= 3 ? C.er : C.ok} />
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.t2, textTransform: 'uppercase', letterSpacing: .5 }}>Sessoes restantes</div>
              </div>
              <div style={{ background: C.white, borderRadius: 16, padding: 18, border: '1px solid ' + C.bd, textAlign: 'center' }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72 }}>
                  <AnimNum value={creditsUsed} color={C.inf} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.t2, textTransform: 'uppercase', letterSpacing: .5 }}>Sessoes realizadas</div>
              </div>
            </div>

            {/* Subscription info */}
            {client.endDate && (
              <div style={{ background: C.white, borderRadius: 14, padding: '14px 18px', border: '1px solid ' + C.bd, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: C.t1 }}>Contrato ate</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDateShort(client.endDate)}</div>
              </div>
            )}

            {/* CTA - Book */}
            <button onClick={() => go('services')}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .15s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(.98)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Marcar sessao
            </button>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginTop: 20, marginBottom: 14, borderBottom: '2px solid ' + C.bg2 }}>
              {['overview','history'].map(tab => (
                <button key={tab} onClick={() => setDashTab(tab)}
                  style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: dashTab === tab ? '2px solid ' + C.dark : '2px solid transparent', fontSize: 12, fontWeight: 600, color: dashTab === tab ? C.dark : C.t2, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: 1, marginBottom: -2, transition: 'all .2s' }}>
                  {tab === 'overview' ? 'Proximas' : 'Historico'}
                </button>
              ))}
            </div>

            {/* Tab: Upcoming */}
            {dashTab === 'overview' && (
              <div>
                {upcoming.length === 0 && <div style={{ textAlign: 'center', color: C.t2, fontSize: 13, padding: '24px 0' }}>Nenhuma sessao marcada</div>}
                {upcoming.map(b => (
                  <div key={b.id} style={{ background: C.white, borderRadius: 14, border: '1px solid ' + C.bd, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bg2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>{new Date(b.date+'T12:00:00').getDate()}</div>
                      <div style={{ fontSize: 8, fontWeight: 600, color: C.t2, textTransform: 'uppercase' }}>{new Date(b.date+'T12:00:00').toLocaleDateString('pt', { month:'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{b.timeSlot} <span style={{ fontSize: 11, color: C.t2, fontWeight: 400 }}>&middot; {b.type === 'trial' ? 'Experimental' : '25 min'}</span></div>
                      <div style={{ fontSize: 11, color: C.ok, fontWeight: 500, marginTop: 2 }}>Confirmada</div>
                    </div>
                    <button onClick={() => handleCancel(b)} disabled={loading}
                      style={{ background: 'none', border: '1px solid ' + C.bd, borderRadius: 8, padding: '6px 10px', fontSize: 10, color: C.er, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.06)'; e.currentTarget.style.borderColor = C.er }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = C.bd }}>
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: History */}
            {dashTab === 'history' && (
              <div>
                {past.length === 0 && <div style={{ textAlign: 'center', color: C.t2, fontSize: 13, padding: '24px 0' }}>Nenhum historico</div>}
                {(showAllHistory ? past : past.slice(0, 8)).map(b => {
                  const stCol = { completed: C.ok, noshow: C.er, cancelled: C.t2 }
                  const stLbl = { completed: 'Realizada', noshow: 'Faltou', cancelled: 'Cancelada' }
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid ' + C.bg2 }}>
                      <div style={{ width: 4, height: 28, borderRadius: 2, background: stCol[b.status] || C.t2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtDateShort(b.date)} &middot; {b.timeSlot}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: stCol[b.status] || C.t2 }}>{stLbl[b.status] || b.status}</span>
                    </div>
                  )
                })}
                {past.length > 8 && !showAllHistory && (
                  <button onClick={() => setShowAllHistory(true)}
                    style={{ width: '100%', padding: 10, background: 'none', border: 'none', fontSize: 12, color: C.t2, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                    Ver tudo ({past.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════ SERVICES ══════ */}
        {step === 'services' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Escolher servico</div>

            {[
              { type: 'trial', title: '1a Sessao Experimental', dur: '15 min', badge: 'Gratis', badgeCol: C.ok, desc: 'Sessao de teste gratuita para experimentar o conceito EMS.' },
              { type: 'normal', title: 'Sessao de Cliente', dur: '25 min', badge: null, desc: 'Treino personalizado adaptado aos seus objetivos.' }
            ].map(svc => (
              <div key={svc.type}
                onClick={() => { setBookingType(svc.type); go('calendar') }}
                style={{ background: C.white, border: '1px solid ' + C.bd, borderRadius: 16, padding: '20px 18px', marginBottom: 12, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.dark; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                {svc.badge && <div style={{ position: 'absolute', top: 0, right: 0, background: svc.badgeCol, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 14px', borderRadius: '0 16px 0 10px', letterSpacing: .5, textTransform: 'uppercase' }}>{svc.badge}</div>}
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{svc.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: C.t2, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11, background: C.bg2, padding: '3px 10px', borderRadius: 6 }}>{svc.dur}</span>
                </div>
                <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.5 }}>{svc.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.dark }}>Escolher &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════ CALENDAR ══════ */}
        {step === 'calendar' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.white, border: '1px solid ' + C.bd, borderRadius: 20, padding: '5px 14px 5px 10px', fontSize: 11, fontWeight: 600, color: C.t1, marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: bookingType === 'trial' ? C.wr : C.inf }} />
              {bookingType === 'trial' ? 'Experimental — 15 min' : 'Sessao cliente — 25 min'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button onClick={() => setCalMonth(p => p.m === 0 ? { y: p.y-1, m: 11 } : { y: p.y, m: p.m-1 })}
                style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid ' + C.bd, background: C.white, cursor: 'pointer', fontSize: 18, color: C.dark, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&lsaquo;</button>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{monthNames[calMonth.m]} {calMonth.y}</span>
              <button onClick={() => setCalMonth(p => p.m === 11 ? { y: p.y+1, m: 0 } : { y: p.y, m: p.m+1 })}
                style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid ' + C.bd, background: C.white, cursor: 'pointer', fontSize: 18, color: C.dark, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&rsaquo;</button>
            </div>

            <div style={{ background: C.white, borderRadius: 16, border: '1px solid ' + C.bd, padding: '14px 10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {['S','T','Q','Q','S','S','D'].map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.t2, padding: '6px 0' }}>{d}</div>
                ))}
                {calDays.map((day, i) => {
                  if (day === null) return <div key={'e'+i} />
                  const ds = dayDateStr(day)
                  const off = isDayOff(day)
                  const isToday = ds === today
                  return (
                    <button key={ds} disabled={off}
                      onClick={() => { setSelDate(ds); setSelSlot(''); go('slots') }}
                      style={{ textAlign: 'center', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: isToday ? 700 : 400, cursor: off ? 'default' : 'pointer', border: 'none', fontFamily: 'inherit', background: isToday ? C.dark : 'transparent', color: isToday ? '#fff' : off ? '#D5D0C9' : C.dark, transition: 'all .15s' }}
                      onMouseEnter={e => { if (!off && !isToday) { e.currentTarget.style.background = C.bg2; e.currentTarget.style.transform = 'scale(1.1)' } }}
                      onMouseLeave={e => { if (!off && !isToday) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = '' } }}>
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════ SLOTS ══════ */}
        {step === 'slots' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginBottom: 20 }}>{fmtDateFull(selDate)}</div>
            {availableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.t2, padding: '40px 0', fontSize: 14 }}>Nenhum horario disponivel</div>
            ) : slotGroups.map(g => (
              <div key={g.k} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>{g.l}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {g.s.map(s => (
                    <button key={s} onClick={() => { setSelSlot(s); go(client ? 'confirm' : 'info') }}
                      style={{ padding: '11px 20px', border: '1px solid ' + C.bd, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: C.white, color: C.dark, fontFamily: "'JetBrains Mono', monospace", transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.dark; e.currentTarget.style.background = C.dark; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.dark; e.currentTarget.style.transform = '' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════ INFO (guests only) ══════ */}
        {step === 'info' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ background: C.white, border: '1px solid ' + C.bd, borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{bookingType === 'trial' ? 'Experimental' : 'Sessao cliente'}</div>
                <div style={{ fontSize: 12, color: C.t2 }}>{fmtDateFull(selDate)}</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>{selSlot}</div>
            </div>

            {[
              { label: 'Nome completo', value: guestName, set: setGuestName, type: 'text', ph: 'Maria Silva', required: true },
              { label: 'Telefone', value: phone, set: setPhone, type: 'tel', ph: '+351 9XX XXX XXX', required: true, readOnly: true },
              { label: 'Email', value: email, set: setEmail, type: 'email', ph: 'email@exemplo.com', required: false }
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6, display: 'block' }}>
                  {f.label} {f.required && '*'}
                </label>
                <input type={f.type} placeholder={f.ph} value={f.value} onChange={e => f.set(e.target.value)} readOnly={f.readOnly} autoFocus={i === 0}
                  style={{ width: '100%', padding: '13px 14px', border: '1px solid ' + C.bd, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: f.readOnly ? C.bg2 : C.white, color: C.dark, boxSizing: 'border-box', transition: 'border .15s' }}
                  onFocus={e => { if (!f.readOnly) e.target.style.borderColor = C.dark }}
                  onBlur={e => e.target.style.borderColor = C.bd} />
              </div>
            ))}
            <button disabled={!guestName.trim()} onClick={() => go('confirm')}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8, opacity: !guestName.trim() ? 0.35 : 1 }}>
              Continuar
            </button>
          </div>
        )}

        {/* ══════ CONFIRM ══════ */}
        {step === 'confirm' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ background: C.white, border: '1px solid ' + C.bd, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
              {[
                { l: 'Servico', v: bookingType === 'trial' ? 'Experimental (15 min)' : 'Sessao cliente (25 min)' },
                { l: 'Data', v: fmtDateFull(selDate) },
                { l: 'Horario', v: selSlot },
                null,
                { l: 'Nome', v: client ? client.name : guestName.trim() },
                { l: 'Telefone', v: phone }
              ].map((r, i) => r === null
                ? <div key={i} style={{ borderBottom: '1px solid ' + C.bg2, margin: '0 18px' }} />
                : <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px' }}>
                    <span style={{ fontSize: 13, color: C.t2 }}>{r.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{r.v}</span>
                  </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.t2, marginBottom: 20, lineHeight: 1.6, textAlign: 'center' }}>
              Cancelamento ate {CANCEL_CUTOFF_HOURS}h antes da sessao.
            </div>
            <button disabled={loading} onClick={handleConfirm}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1, transition: 'all .2s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(.98)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              {loading ? 'A confirmar...' : 'Confirmar marcacao'}
            </button>
          </div>
        )}

        {/* ══════ SUCCESS ══════ */}
        {step === 'success' && (
          <div style={{ paddingTop: 48, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(45,140,90,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D8C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Confirmada!</div>
            <div style={{ fontSize: 15, color: C.t1, marginBottom: 4 }}>{fmtDateFull(selDate)} as {selSlot}</div>
            <div style={{ fontSize: 13, color: bookingType === 'trial' ? C.wr : C.inf, fontWeight: 600, marginBottom: 32 }}>
              {bookingType === 'trial' ? 'Sessao experimental' : 'Sessao cliente'} &middot; {bookingType === 'trial' ? '15' : '25'} min
            </div>
            <div style={{ background: C.bg2, borderRadius: 16, padding: 18, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>INFORMACOES</div>
              <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.8 }}>
                Apresente-se 5 minutos antes.<br />{STUDIO_ADDR}<br />{STUDIO_PHONE}
              </div>
            </div>
            {client ? (
              <button onClick={() => { setDashTab('overview'); go('dashboard', 'left') }}
                style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Voltar ao meu espaco
              </button>
            ) : (
              <button onClick={() => { setStep('services'); setSelDate(''); setSelSlot(''); setGuestName(''); setPhone(''); setEmail(''); setBookingType('') }}
                style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Nova marcacao
              </button>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '24px 0 8px', fontSize: 10, color: '#C8C2B8', letterSpacing: 1 }}>
          BODYFIT EMS STUDIO
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
      `}</style>
    </div>
  )
}
