import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, dbToBooking } from '../lib/supabase'
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
const fmtDateAriaLabel = (d) => {
  const dt = new Date(d+'T12:00:00')
  const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${dt.getDate()} de ${months[dt.getMonth()]} de ${dt.getFullYear()}`
}
const monthNames = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STUDIO_PHONE = '+351 964 684 718'
const STUDIO_ADDR = 'R. Campo de Ourique 103, Lisboa'

function generateIcsUrl(date, timeSlot, type) {
  const [h, m] = timeSlot.split(':').map(Number)
  const dur = type === 'trial' ? 15 : 25
  const start = new Date(date + 'T' + timeSlot + ':00')
  const end = new Date(start.getTime() + dur * 60000)
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    'DTSTART:' + fmt(start), 'DTEND:' + fmt(end),
    'SUMMARY:BODYFIT EMS ' + (type === 'trial' ? 'Sessao Experimental' : 'Sessao'),
    'LOCATION:' + STUDIO_ADDR,
    'DESCRIPTION:Apresente-se 5 min antes. Tel: ' + STUDIO_PHONE,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n')
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
}

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
  const [rememberMe, setRememberMe] = useState(false)

  // #9: localStorage auto-identify on mount
  useEffect(() => {
    const saved = localStorage.getItem('bodyfit_phone')
    if (saved) {
      setPhone(saved)
      autoIdentify(saved)
    }
  }, [])

  async function autoIdentify(savedPhone) {
    const normalized = normalizePhone(savedPhone)
    if (!normalized) return
    setLoading(true)
    try {
      let data = null
      const attempts = [normalized]
      if (!normalized.startsWith('+351')) attempts.push('+351' + normalized.replace(/^0+/, ''))
      if (normalized.startsWith('+351')) attempts.push(normalized.replace(/^\+351/, ''))
      for (const a of attempts) {
        const r = await supabase.from('public_client_booking_view').select('id,name,phone,status,sub,credits,used,bonus,rem,start_date,end_date').eq('phone', a).single()
        if (r.data) {
          data = {
            id: r.data.id, name: r.data.name, phone: r.data.phone, status: r.data.status,
            sub: r.data.sub, credits: r.data.credits, used: r.data.used, bonus: r.data.bonus,
            rem: r.data.rem, startDate: r.data.start_date, endDate: r.data.end_date
          }
          break
        }
      }
      if (data) {
        setClient(data); setPhone(data.phone); setGuestName(data.name)
        await loadBookings(data.phone)
        go('dashboard')
      } else {
        // Saved phone but no longer a client — clear
        localStorage.removeItem('bodyfit_phone')
      }
    } catch {
      localStorage.removeItem('bodyfit_phone')
    }
    finally { setLoading(false) }
  }

  // #10: No auto-dismiss — removed the 4s timeout

  const go = useCallback((next, direction) => {
    setDir(direction || 'right')
    setPrevStep(step)
    setStep(next)
  }, [step])

  async function loadBookings(ph) {
    const p = ph || phone
    const td = new Date(); td.setDate(td.getDate() - 1)
    const minDate = td.toISOString().split('T')[0]
    const all = await supabase.from('bookings').select('*').in('status', ['confirmed','completed']).gte('date', minDate)
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
        const r = await supabase.from('public_client_booking_view').select('id,name,phone,status,sub,credits,used,bonus,rem,start_date,end_date').eq('phone', a).single()
        if (r.data) {
          data = {
            id: r.data.id, name: r.data.name, phone: r.data.phone, status: r.data.status,
            sub: r.data.sub, credits: r.data.credits, used: r.data.used, bonus: r.data.bonus,
            rem: r.data.rem, startDate: r.data.start_date, endDate: r.data.end_date
          }
          break
        }
      }
      if (data) {
        setClient(data); setPhone(data.phone); setGuestName(data.name)
        // #9: save phone if remember me is checked
        if (rememberMe) localStorage.setItem('bodyfit_phone', data.phone)
        await loadBookings(data.phone)
        go('dashboard')
      } else {
        setClient(null)
        await loadBookings(normalized)
        go('guest')
      }
    } catch {
      // #11: specific error for network
      setError('Erro de conexao. Verifique a sua ligacao a internet e tente novamente.')
    }
    finally { setLoading(false) }
  }

  async function handleConfirm() {
    const trimName = client ? client.name : guestName.trim()
    const trimPhone = normalizePhone(phone)
    // #14: name validation min 2 chars
    if (!trimName || trimName.length < 2) { setError('O nome deve ter pelo menos 2 caracteres.'); return }
    if (!trimPhone) { setError('Preencha o telefone.'); return }

    // P0: Credit validation for existing clients (not guests/trials)
    if (client && bookingType === 'normal') {
      const rem = client.rem ?? ((client.credits || 0) - (client.used || 0))
      if (rem <= 0) {
        setError('Sem sessoes disponiveis. Contacte o studio para renovar o seu pacote.')
        return
      }
    }

    setLoading(true); setError('')
    try {
      // P0: Re-fetch availability right before booking to avoid stale data
      const freshCheck = await supabase.from('bookings').select('id').eq('date', selDate).eq('time_slot', selSlot).in('status', ['confirmed','completed'])
      if (freshCheck.data && freshCheck.data.length >= MAX_MACHINES) {
        // #11: slot-taken specific error
        setError('Este horario acabou de ser preenchido. Por favor escolha outro horario.')
        setLoading(false)
        go('slots', 'left')
        return
      }

      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
      const ts = new Date().toISOString()

      // P0: Try atomic booking via RPC first, fallback to direct insert
      let booked = false
      const rpcResult = await supabase.rpc('book_slot', {
        p_id: id, p_client_id: client?.id || '', p_client_name: trimName,
        p_client_phone: trimPhone, p_date: selDate, p_time_slot: selSlot,
        p_type: bookingType, p_notes: !client ? 'Novo prospecto' : ''
      })
      if (rpcResult.error) {
        // RPC not available — fallback to direct insert (pre-checked above)
        const { error: err } = await supabase.from('bookings').insert({
          id, client_id: client?.id || '', client_name: trimName, client_phone: trimPhone,
          date: selDate, time_slot: selSlot, type: bookingType, status: 'confirmed',
          notes: !client ? 'Novo prospecto' : '', created_at: ts, updated_at: ts
        })
        if (err) {
          // #11: differentiate insert error
          setError('Erro ao guardar a reserva. Tente novamente.')
          return
        }
        booked = true
      } else {
        if (rpcResult.data === 'FULL') {
          setError('Este horario acabou de ser preenchido. Por favor escolha outro horario.')
          go('slots', 'left')
          return
        }
        booked = true
      }

      if (booked) {
        await loadBookings(trimPhone)
        go('success')
      }
    } catch {
      // #11: network error
      setError('Erro de conexao. Verifique a sua ligacao a internet e tente novamente.')
    }
    finally { setLoading(false) }
  }

  async function handleCancel(bk) {
    setLoading(true)
    const { data: result, error: err } = await supabase.rpc('cancel_booking', {
      p_id: bk.id,
      p_client_phone: phone
    })
    if (err) {
      // RPC not available — fallback to direct update (pre-validated client-side)
      await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bk.id).eq('client_phone', phone)
    } else if (result === 'TOO_LATE') {
      setError('Cancelamento impossivel a menos de 2h da sessao.')
      setLoading(false)
      return
    } else if (result === 'UNAUTHORIZED') {
      setError('Nao autorizado.')
      setLoading(false)
      return
    } else if (result !== 'OK') {
      setError('Erro ao cancelar.')
      setLoading(false)
      return
    }
    await loadBookings(phone); setLoading(false)
  }

  // #2: Quick rebook — next week same time
  function handleQuickRebook(session) {
    const d = new Date(session.date + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    const rebookDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
    setSelDate(rebookDate)
    setSelSlot(session.timeSlot)
    setBookingType(session.type === 'trial' ? 'trial' : 'normal')
    go('confirm')
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

  // #4: Pre-compute availability per calendar day
  const dayAvailability = useMemo(() => {
    const avail = {}
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const ds = dayDateStr(i)
      if (isDayOff(i)) continue
      const slots = generateSlots(ds)
      if (slots.length === 0) continue
      const totalCapacity = slots.length * MAX_MACHINES
      const bookedCount = allBookings.filter(b => b.date === ds && (b.status === 'confirmed' || b.status === 'completed')).length
      const nowD = new Date()
      // Also filter out past slots for today
      let availSlots = slots.length
      if (ds === today) {
        availSlots = slots.filter(slot => {
          const [h, m] = slot.split(':').map(Number)
          const s = new Date(); s.setHours(h, m, 0, 0)
          return s > nowD
        }).length
      }
      const availCapacity = availSlots * MAX_MACHINES - bookedCount
      avail[ds] = availCapacity > 0 ? 'available' : 'full'
    }
    return avail
  }, [calMonth, allBookings, lastDay])

  // Slots
  const slotsForDate = selDate ? generateSlots(selDate) : []
  const bookingsForDate = allBookings.filter(b => b.date === selDate)
  const now = new Date()
  const availableSlots = slotsForDate.filter(slot => {
    const count = bookingsForDate.filter(b => b.timeSlot === slot && (b.status === 'confirmed' || b.status === 'completed')).length
    if (count >= MAX_MACHINES) return false
    if (selDate === today) { const [h, m] = slot.split(':').map(Number); const s = new Date(); s.setHours(h, m, 0, 0); if (s <= now) return false }
    return true
  })

  // #7: Compute slot booking counts for urgency badges
  const slotBookedCounts = useMemo(() => {
    const counts = {}
    bookingsForDate.forEach(b => {
      if (b.status === 'confirmed' || b.status === 'completed') {
        counts[b.timeSlot] = (counts[b.timeSlot] || 0) + 1
      }
    })
    return counts
  }, [bookingsForDate])

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

  // #21: Check if cancel is within cutoff window
  function canCancelBooking(bk) {
    const st = new Date(bk.date + 'T' + bk.timeSlot + ':00')
    return (st - new Date()) > CANCEL_CUTOFF_HOURS * 3600000
  }

  // ─── Progress step values ───
  const stepProgressMap = client
    ? { calendar: 33, slots: 66, confirm: 100 }
    : { services: 20, calendar: 40, slots: 60, info: 80, confirm: 100 }

  // ─── STYLES ───
  const C = { bg: '#F5F3EF', bg2: '#EDEAE4', white: '#FFFFFF', dark: '#1A1714', t1: '#6B6560', t2: '#736B63', bd: '#DED9D0', ok: '#2D8C5A', wr: '#C47F17', er: '#C0392B', inf: '#2E6DA4' }

  // #1: Determine back step for nav
  function getBackStep() {
    if (client) {
      // Existing clients skip services: dashboard -> calendar -> slots -> confirm
      if (step === 'calendar') return 'dashboard'
      if (step === 'slots') return 'calendar'
      if (step === 'confirm') return 'slots'
    } else {
      // Guests: guest -> services -> calendar -> slots -> info -> confirm
      if (step === 'services') return 'guest'
      if (step === 'calendar') return 'services'
      if (step === 'slots') return 'calendar'
      if (step === 'info') return 'slots'
      if (step === 'confirm') return 'info'
    }
    return 'identify'
  }

  // Step labels for nav
  const stepLabels = client
    ? { calendar: 'Data', slots: 'Horario', confirm: 'Confirmar' }
    : { services: 'Servicos', calendar: 'Data', slots: 'Horario', info: 'Dados', confirm: 'Confirmar' }

  // Which steps show the nav bar
  const navSteps = client
    ? ['calendar', 'slots', 'confirm']
    : ['services', 'calendar', 'slots', 'info', 'confirm']

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
      {navSteps.includes(step) && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 48, background: C.white, borderBottom: '1px solid ' + C.bd, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => go(getBackStep(), 'left')}
            aria-label="Voltar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.dark, padding: '4px 12px 4px 0', fontFamily: 'inherit' }}>&larr;</button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
            {stepLabels[step] || ''}
          </div>
          {/* #18: Progress bar with ARIA */}
          <div style={{ width: 80, height: 3, background: C.bg2, borderRadius: 2, overflow: 'hidden' }}
            role="progressbar"
            aria-valuenow={stepProgressMap[step] || 0}
            aria-valuemin={0}
            aria-valuemax={100}>
            <div style={{ height: '100%', background: C.dark, borderRadius: 2, transition: 'width .4s ease',
              width: (stepProgressMap[step] || 0) + '%' }} />
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 32px' }}>
        {/* #10 & #16: Error banner with close button and ARIA */}
        {error && (
          <div role="alert" aria-live="assertive"
            style={{ background: 'rgba(192,57,43,.08)', color: C.er, padding: '10px 14px', borderRadius: 10, fontSize: 13, marginTop: 16, border: '1px solid rgba(192,57,43,.12)', animation: 'shake .3s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError('')}
              aria-label="Fechar erro"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.er, fontSize: 18, fontWeight: 700, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>&times;</button>
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
              {/* #12 & #13: autocomplete and inputMode */}
              <input type="tel" placeholder="+351 9XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} autoFocus
                autoComplete="tel" inputMode="tel"
                style={{ width: '100%', padding: '14px 0', border: 'none', borderBottom: '2px solid ' + C.bd, fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, outline: 'none', background: 'transparent', color: C.dark, boxSizing: 'border-box', transition: 'border-color .2s', textAlign: 'center', letterSpacing: 2 }}
                onFocus={e => e.target.style.borderBottomColor = C.dark}
                onBlur={e => e.target.style.borderBottomColor = C.bd} />
            </div>
            {/* #9: Remember me checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontSize: 13, color: C.t1 }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: C.dark, cursor: 'pointer' }} />
              Lembrar-me
            </label>
            {/* #15: specific CTA text */}
            <button type="submit" disabled={loading || !phone.trim()}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 16, opacity: (!phone.trim() || loading) ? 0.35 : 1, transition: 'all .2s' }}>
              {loading ? 'A verificar...' : 'Verificar numero'}
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
              {/* #12: autocomplete="name", #14: min 2 chars */}
              <input type="text" placeholder="Nome completo" value={guestName} onChange={e => setGuestName(e.target.value)} autoFocus
                autoComplete="name"
                style={{ width: '100%', padding: '12px 0', border: 'none', borderBottom: '2px solid ' + C.bd, fontSize: 16, fontWeight: 500, outline: 'none', background: 'transparent', color: C.dark, boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderBottomColor = C.dark}
                onBlur={e => e.target.style.borderBottomColor = C.bd} />
              {guestName.trim().length > 0 && guestName.trim().length < 2 && (
                <div style={{ fontSize: 11, color: C.er, marginTop: 4 }}>O nome deve ter pelo menos 2 caracteres.</div>
              )}
            </div>
            {/* #3: Guest can ONLY book trial — skip services, go straight to calendar */}
            <button disabled={!guestName.trim() || guestName.trim().length < 2} onClick={() => { setBookingType('trial'); go('calendar') }}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (!guestName.trim() || guestName.trim().length < 2) ? 0.35 : 1, transition: 'opacity .2s' }}>
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
              <button onClick={() => { setClient(null); setPhone(''); localStorage.removeItem('bodyfit_phone'); go('identify', 'left') }}
                style={{ background: 'none', border: '1px solid ' + C.bd, borderRadius: 8, padding: '6px 10px', fontSize: 10, color: C.t2, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sair
              </button>
            </div>

            {/* Next session banner */}
            {nextSession && (
              <div style={{ background: C.dark, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Proxima sessao</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{fmtDateFull(nextSession.date)}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: '#fff' }}>{nextSession.timeSlot}</div>
                </div>
                {/* #2: Quick rebook button */}
                <button onClick={() => handleQuickRebook(nextSession)}
                  style={{ marginTop: 12, width: '100%', padding: '10px 0', background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}>
                  Repetir proxima semana
                </button>
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

            {/* Credit warning */}
            {client && creditsRem <= 3 && creditsRem > 0 && (
              <div style={{ background: 'rgba(196,127,23,.08)', border: '1px solid rgba(196,127,23,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.wr }}>Poucas sessoes restantes ({creditsRem})</div>
                  <div style={{ fontSize: 11, color: C.t1 }}>Contacte o studio para renovar o seu pacote.</div>
                </div>
              </div>
            )}
            {client && creditsRem <= 0 && bookingType !== 'trial' && (
              <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🚫</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.er }}>Sem sessoes disponiveis</div>
                  <a href={'https://wa.me/351964684718?text=' + encodeURIComponent('Ola, gostaria de renovar o meu pacote.')} target="_blank" rel="noopener"
                    style={{ fontSize: 11, color: C.ok, fontWeight: 600, textDecoration: 'none' }}>Renovar via WhatsApp &rarr;</a>
                </div>
              </div>
            )}

            {/* #1: CTA - Book — existing clients skip services, go straight to calendar */}
            <button onClick={() => { setBookingType('normal'); go('calendar') }}
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
                {upcoming.map(b => {
                  const canCancel = canCancelBooking(b)
                  return (
                    <div key={b.id} style={{ background: C.white, borderRadius: 14, border: '1px solid ' + C.bd, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bg2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>{new Date(b.date+'T12:00:00').getDate()}</div>
                        <div style={{ fontSize: 8, fontWeight: 600, color: C.t2, textTransform: 'uppercase' }}>{new Date(b.date+'T12:00:00').toLocaleDateString('pt', { month:'short' })}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{b.timeSlot} <span style={{ fontSize: 11, color: C.t2, fontWeight: 400 }}>&middot; {b.type === 'trial' ? 'Experimental' : '25 min'}</span></div>
                        <div style={{ fontSize: 11, color: C.ok, fontWeight: 500, marginTop: 2 }}>Confirmada</div>
                      </div>
                      {/* #21: Hide cancel button when within cutoff window */}
                      {canCancel && (
                        <button onClick={() => handleCancel(b)} disabled={loading}
                          style={{ background: 'none', border: '1px solid ' + C.bd, borderRadius: 8, padding: '6px 10px', fontSize: 10, color: C.er, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.06)'; e.currentTarget.style.borderColor = C.er }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = C.bd }}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  )
                })}
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

        {/* ══════ SERVICES (only for guests) ══════ */}
        {step === 'services' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Escolher servico</div>

            {/* #3: Guest can only book trial — filter services based on client status */}
            {(() => {
              const allServices = [
                { type: 'trial', title: '1a Sessao Experimental', dur: '15 min', badge: 'Gratis', badgeCol: C.ok, desc: 'Sessao de teste gratuita para experimentar o conceito EMS.' },
                { type: 'normal', title: 'Sessao de Cliente', dur: '25 min', badge: null, desc: 'Treino personalizado adaptado aos seus objetivos.' }
              ]
              // If no client (guest), only show trial
              const services = client ? allServices : allServices.filter(s => s.type === 'trial')
              return services.map(svc => (
                // #20: Service cards as <button> not <div>
                <button key={svc.type}
                  onClick={() => { setBookingType(svc.type); go('calendar') }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: C.white, border: '1px solid ' + C.bd, borderRadius: 16, padding: '20px 18px', marginBottom: 12, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden', fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}
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
                </button>
              ))
            })()}
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
                {/* #5: 3-letter day headers */}
                {['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.t2, padding: '6px 0' }}>{d}</div>
                ))}
                {calDays.map((day, i) => {
                  if (day === null) return <div key={'e'+i} />
                  const ds = dayDateStr(day)
                  const off = isDayOff(day)
                  const isToday = ds === today
                  const avail = dayAvailability[ds] // 'available' | 'full' | undefined
                  return (
                    // #17: ARIA on calendar day buttons with full date
                    <button key={ds} disabled={off}
                      aria-label={fmtDateAriaLabel(ds) + (avail === 'full' ? ', sem disponibilidade' : avail === 'available' ? ', disponivel' : '')}
                      onClick={async () => {
                        setSelDate(ds); setSelSlot('')
                        // #6: Re-fetch bookings when entering slots step
                        await loadBookings(phone)
                        go('slots')
                      }}
                      style={{ textAlign: 'center', padding: '10px 0 14px', borderRadius: 12, fontSize: 14, fontWeight: isToday ? 700 : 400, cursor: off ? 'default' : 'pointer', border: 'none', fontFamily: 'inherit', background: isToday ? C.dark : 'transparent', color: isToday ? '#fff' : off ? '#D5D0C9' : C.dark, transition: 'all .15s', position: 'relative' }}
                      onMouseEnter={e => { if (!off && !isToday) { e.currentTarget.style.background = C.bg2; e.currentTarget.style.transform = 'scale(1.1)' } }}
                      onMouseLeave={e => { if (!off && !isToday) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = '' } }}>
                      {day}
                      {/* #4: Availability dots */}
                      {!off && avail && (
                        <span style={{
                          position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                          width: 5, height: 5, borderRadius: '50%',
                          background: avail === 'available' ? C.ok : C.er
                        }} />
                      )}
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
                {/* #8: CSS grid layout for even slot distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {g.s.map(s => {
                    const booked = slotBookedCounts[s] || 0
                    // #7: Urgency indicator
                    const urgencyLabel = booked === (MAX_MACHINES - 1) ? 'Ultimo lugar!' : booked === (MAX_MACHINES - 2) && MAX_MACHINES >= 3 ? '2 lugares' : null
                    return (
                      <button key={s} onClick={() => { setSelSlot(s); go(client ? 'confirm' : 'info') }}
                        style={{ padding: '11px 8px', border: '1px solid ' + C.bd, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: C.white, color: C.dark, fontFamily: "'JetBrains Mono', monospace", transition: 'all .15s', position: 'relative', textAlign: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.dark; e.currentTarget.style.background = C.dark; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.dark; e.currentTarget.style.transform = '' }}>
                        {s}
                        {urgencyLabel && (
                          <div style={{ fontSize: 8, fontWeight: 700, color: booked === (MAX_MACHINES - 1) ? C.er : C.wr, marginTop: 2, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0 }}>
                            {urgencyLabel}
                          </div>
                        )}
                      </button>
                    )
                  })}
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

            {/* #12: autocomplete attributes on all inputs */}
            {[
              { label: 'Nome completo', value: guestName, set: setGuestName, type: 'text', ph: 'Maria Silva', required: true, ac: 'name' },
              { label: 'Telefone', value: phone, set: setPhone, type: 'tel', ph: '+351 9XX XXX XXX', required: true, readOnly: true, ac: 'tel', im: 'tel' },
              { label: 'Email', value: email, set: setEmail, type: 'email', ph: 'email@exemplo.com', required: false, ac: 'email' }
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6, display: 'block' }}>
                  {f.label} {f.required && '*'}
                </label>
                <input type={f.type} placeholder={f.ph} value={f.value} onChange={e => f.set(e.target.value)} readOnly={f.readOnly} autoFocus={i === 0}
                  autoComplete={f.ac} inputMode={f.im || undefined}
                  style={{ width: '100%', padding: '13px 14px', border: '1px solid ' + C.bd, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: f.readOnly ? C.bg2 : C.white, color: C.dark, boxSizing: 'border-box', transition: 'border .15s' }}
                  onFocus={e => { if (!f.readOnly) e.target.style.borderColor = C.dark }}
                  onBlur={e => e.target.style.borderColor = C.bd} />
                {/* #14: name validation feedback */}
                {f.label === 'Nome completo' && guestName.trim().length > 0 && guestName.trim().length < 2 && (
                  <div style={{ fontSize: 11, color: C.er, marginTop: 4 }}>O nome deve ter pelo menos 2 caracteres.</div>
                )}
              </div>
            ))}
            {/* #15: specific CTA text */}
            <button disabled={!guestName.trim() || guestName.trim().length < 2} onClick={() => go('confirm')}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8, opacity: (!guestName.trim() || guestName.trim().length < 2) ? 0.35 : 1 }}>
              Rever e confirmar
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
            {/* #15: include time in confirm button text */}
            <button disabled={loading} onClick={handleConfirm}
              style={{ width: '100%', padding: 16, background: C.dark, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1, transition: 'all .2s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(.98)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              {loading ? 'A confirmar...' : `Confirmar as ${selSlot}`}
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
            {/* Add to calendar */}
            <a href={generateIcsUrl(selDate, selSlot, bookingType)} download="bodyfit-sessao.ics"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, background: C.white, border: '1px solid ' + C.bd, borderRadius: 12, fontSize: 14, fontWeight: 600, color: C.dark, textDecoration: 'none', marginBottom: 16, cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.dark }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19,4H5A2,2,0,0,0,3,6V20A2,2,0,0,0,5,22H19A2,2,0,0,0,21,20V6A2,2,0,0,0,19,4Z M16,2V6 M8,2V6 M3,10H21" /></svg>
              Adicionar ao calendario
            </a>

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
              <button onClick={() => { setStep('identify'); setSelDate(''); setSelSlot(''); setGuestName(''); setPhone(''); setEmail(''); setBookingType('') }}
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
