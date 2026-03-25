import { useState, useEffect } from 'react'
import { supabase, dbToBooking } from '../lib/supabase'
import { generateSlots } from '../lib/helpers'
import { MAX_MACHINES, CANCEL_CUTOFF_HOURS } from '../lib/constants'

const fmtDateFr = (d) => {
  const dt = new Date(d + 'T12:00:00')
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const months = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre']
  return `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

const todayStr = () => {
  const n = new Date()
  return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0')
}

const normalizePhone = (p) => p.trim().replace(/[\s\-().]/g, '')

export default function BookingPublic() {
  const [step, setStep] = useState('identify')
  const [phone, setPhone] = useState('')
  const [client, setClient] = useState(null) // { id, name, phone, isNew }
  const [guestName, setGuestName] = useState('')
  const [selDate, setSelDate] = useState('')
  const [selSlot, setSelSlot] = useState('')
  const [bookingType, setBookingType] = useState('normal') // normal | trial
  const [allBookings, setAllBookings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(t)
    }
  }, [error])

  async function loadBookings(ph) {
    const p = ph || phone
    const all = await supabase.from('bookings').select('*').in('status', ['confirmed','completed'])
    setAllBookings((all.data || []).map(dbToBooking))
    if (p) {
      const my = await supabase.from('bookings').select('*').eq('client_phone', p)
      setMyBookings(
        (my.data || []).map(dbToBooking).sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot))
      )
    }
  }

  async function handleIdentify(e) {
    e.preventDefault()
    const normalized = normalizePhone(phone)
    if (!normalized) return
    setPhone(normalized)
    setLoading(true)
    setError('')
    try {
      // Try exact match, then with/without +351 prefix
      let data = null
      const attempts = [normalized]
      if (!normalized.startsWith('+351')) attempts.push('+351' + normalized.replace(/^0+/, ''))
      if (normalized.startsWith('+351')) attempts.push(normalized.replace(/^\+351/, ''))

      for (const attempt of attempts) {
        const r = await supabase.from('clients').select('id,name,phone').eq('phone', attempt).single()
        if (r.data) { data = r.data; break }
      }

      if (data) {
        // Existing client found
        setClient({ id: data.id, name: data.name, phone: data.phone, isNew: false })
        setPhone(data.phone)
        setBookingType('normal')
        await loadBookings(data.phone)
        setStep('menu')
      } else {
        // New person — ask for name
        setClient(null)
        setBookingType('trial')
        setStep('newGuest')
      }
    } catch {
      setError('Erreur de connexion. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }

  function handleGuestContinue(e) {
    e.preventDefault()
    const name = guestName.trim()
    if (!name) return
    setClient({ id: null, name, phone, isNew: true })
    loadBookings(phone)
    setStep('menu')
  }

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
      const now = new Date().toISOString()
      const { error: err } = await supabase.from('bookings').insert({
        id,
        client_id: client.id || '',
        client_name: client.name,
        client_phone: phone,
        date: selDate,
        time_slot: selSlot,
        type: bookingType,
        status: 'confirmed',
        notes: client.isNew ? 'Nouveau prospect' : '',
        created_at: now,
        updated_at: now
      })
      if (err) {
        setError('Erreur lors de la reservation. Veuillez reessayer.')
      } else {
        await loadBookings(phone)
        setStep('success')
      }
    } catch {
      setError('Erreur de connexion. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(booking) {
    const sessionTime = new Date(booking.date + 'T' + booking.timeSlot + ':00')
    const now = new Date()
    if (sessionTime - now <= CANCEL_CUTOFF_HOURS * 3600000) {
      setError('Annulation impossible moins de 2h avant la seance')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
      if (err) {
        setError('Erreur lors de l\'annulation. Veuillez reessayer.')
      } else {
        await loadBookings(phone)
      }
    } catch {
      setError('Erreur de connexion. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }

  // Calendar helpers
  const firstDay = new Date(calMonth.y, calMonth.m, 1)
  const lastDay = new Date(calMonth.y, calMonth.m + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const calDays = []
  for (let i = 0; i < startPad; i++) calDays.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) calDays.push(d)

  const monthNames = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']

  const today = todayStr()
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)

  function isDayOff(day) {
    if (!day) return true
    const dateStr = calMonth.y + '-' + String(calMonth.m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    const dt = new Date(dateStr + 'T12:00:00')
    if (dt.getDay() === 0) return true
    if (dateStr < today) return true
    if (dt > maxDate) return true
    return false
  }

  function dayDateStr(day) {
    return calMonth.y + '-' + String(calMonth.m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  }

  // Slots
  const slotsForDate = selDate ? generateSlots(selDate) : []
  const bookingsForDate = allBookings.filter(b => b.date === selDate && b.status === 'confirmed')
  const now = new Date()

  const availableSlots = slotsForDate.filter(slot => {
    const count = bookingsForDate.filter(b => b.timeSlot === slot).length
    if (count >= MAX_MACHINES) return false
    if (selDate === today) {
      const [h, m] = slot.split(':').map(Number)
      const slotTime = new Date()
      slotTime.setHours(h, m, 0, 0)
      if (slotTime <= now) return false
    }
    return true
  })

  // My bookings split
  const upcomingBookings = myBookings.filter(
    b => b.status === 'confirmed' && b.date >= today
  ).sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot))

  const pastBookings = myBookings.filter(
    b => b.status !== 'confirmed' || b.date < today
  )

  const statusBadge = (b) => {
    if (b.status === 'confirmed' && b.date >= today) return <span className="bg bg-ok">Confirmee</span>
    if (b.status === 'completed') return <span className="bg bg-inf">Terminee</span>
    if (b.status === 'cancelled') return <span className="bg bg-er">Annulee</span>
    if (b.status === 'noshow') return <span className="bg bg-wr">Absent</span>
    if (b.date < today) return <span className="bg">Passee</span>
    return <span className="bg">{b.status}</span>
  }

  function prevMonth() {
    setCalMonth(prev => {
      const m = prev.m - 1
      return m < 0 ? { y: prev.y - 1, m: 11 } : { y: prev.y, m }
    })
  }

  function nextMonth() {
    setCalMonth(prev => {
      const m = prev.m + 1
      return m > 11 ? { y: prev.y + 1, m: 0 } : { y: prev.y, m }
    })
  }

  return (
    <div className="bk-page">
      <div className="bk-card bk-in" key={step}>

        {error && (
          <div style={{ color: '#c0392b', fontSize: 13, background: '#fdeaea', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── IDENTIFY ── */}
        {step === 'identify' && (
          <form onSubmit={handleIdentify}>
            <div className="bk-logo">BODY<em>FIT</em></div>
            <div className="bk-sub">Campo de Ourique</div>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Reserver une seance
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 24 }}>
              Entrez votre numero pour commencer
            </div>
            <div className="fg">
              <label className="fl">Numero de telephone</label>
              <input
                className="fi"
                type="tel"
                placeholder="+351 9XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <button className="bt bp" type="submit" disabled={loading || !phone.trim()} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Verification...' : 'Continuer'}
            </button>
          </form>
        )}

        {/* ── NEW GUEST (phone not found) ── */}
        {step === 'newGuest' && (
          <form onSubmit={handleGuestContinue}>
            <div className="bk-logo">BODY<em>FIT</em></div>
            <div className="bk-sub">Campo de Ourique</div>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Bienvenue !
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 24 }}>
              Vous etes nouveau ? Reservez votre seance d'essai
            </div>
            <div className="fg" style={{ marginBottom: 10 }}>
              <label className="fl">Votre nom et prenom</label>
              <input
                className="fi"
                type="text"
                placeholder="Ex: Jean Dupont"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="fg" style={{ marginBottom: 10 }}>
              <label className="fl">Telephone</label>
              <div className="fi" style={{ background: 'var(--b1)', cursor: 'default', color: 'var(--t1)' }}>{phone}</div>
            </div>
            <button className="bt bp" type="submit" disabled={!guestName.trim()} style={{ width: '100%', marginTop: 4 }}>
              Continuer
            </button>
            <button
              type="button"
              style={{ width: '100%', marginTop: 8, fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => { setStep('identify'); setPhone('') }}
            >
              Modifier le numero
            </button>
          </form>
        )}

        {/* ── MENU ── */}
        {step === 'menu' && client && (
          <div>
            <div className="bk-logo">BODY<em>FIT</em></div>
            <div className="bk-sub">Campo de Ourique</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 24, marginBottom: 24 }}>
              {client.isNew ? `Bienvenue, ${client.name}` : `Bonjour, ${client.name}`}
            </div>

            {/* Book a session */}
            <div
              style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: '18px 16px', marginBottom: 12, cursor: 'pointer', transition: 'background .15s' }}
              onClick={() => { setSelDate(''); setSelSlot(''); setBookingType(client.isNew ? 'trial' : 'normal'); setStep('calendar') }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--b3)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {client.isNew ? "Reserver une seance d'essai" : 'Reserver une seance'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Choisir une date et un creneau</div>
            </div>

            {/* My bookings (show for everyone, new guests might have just booked) */}
            <div
              style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: '18px 16px', marginBottom: 20, cursor: 'pointer', transition: 'background .15s' }}
              onClick={async () => { setLoading(true); await loadBookings(phone); setLoading(false); setStep('myBookings') }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--b3)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Mes reservations {upcomingBookings.length > 0 && <span style={{ fontWeight: 400, fontSize: 13 }}>({upcomingBookings.length})</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Voir et gerer mes seances</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                style={{ fontSize: 11, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setClient(null); setPhone(''); setGuestName(''); setStep('identify') }}
              >
                Changer de compte
              </button>
            </div>
          </div>
        )}

        {/* ── CALENDAR ── */}
        {step === 'calendar' && (
          <div>
            <button className="bt bs bsm" onClick={() => setStep('menu')} style={{ marginBottom: 12 }}>
              &larr; Retour
            </button>
            {client?.isNew && (
              <div style={{ background: 'var(--wrg)', border: '1px solid rgba(196,127,23,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: 'var(--wr)' }}>
                Seance d'essai gratuite &mdash; 15 minutes
              </div>
            )}
            <div className="bk-step">Etape 1/3</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Choisir une date</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button className="bt bs bsm" onClick={prevMonth}>&lt;</button>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{monthNames[calMonth.m]} {calMonth.y}</span>
              <button className="bt bs bsm" onClick={nextMonth}>&gt;</button>
            </div>
            <div className="bk-cal">
              {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                <div className="bk-cal-hd" key={d}>{d}</div>
              ))}
              {calDays.map((day, i) => {
                if (day === null) return <div className="bk-cal-d empty" key={'e' + i} />
                const ds = dayDateStr(day)
                const off = isDayOff(day)
                const isSel = ds === selDate
                const isToday = ds === today
                return (
                  <button
                    key={ds}
                    className={'bk-cal-d' + (off ? ' off' : '') + (isSel ? ' sel' : '') + (isToday ? ' today' : '')}
                    disabled={off}
                    onClick={() => { setSelDate(ds); setSelSlot(''); setStep('slots') }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SLOTS ── */}
        {step === 'slots' && (
          <div>
            <button className="bt bs bsm" onClick={() => setStep('calendar')} style={{ marginBottom: 12 }}>
              &larr; Retour
            </button>
            <div className="bk-step">Etape 2/3</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Choisir un creneau</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>{fmtDateFr(selDate)}</div>
            {availableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--t2)', fontSize: 13, padding: '24px 0' }}>
                Aucun creneau disponible pour cette date
              </div>
            ) : (
              <div className="bk-slots">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    className={'bk-slot' + (selSlot === slot ? ' sel' : '')}
                    onClick={() => { setSelSlot(slot); setStep('confirm') }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === 'confirm' && (
          <div>
            <button className="bt bs bsm" onClick={() => setStep('slots')} style={{ marginBottom: 12 }}>
              &larr; Retour
            </button>
            <div className="bk-step">Etape 3/3</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Confirmer la reservation</div>
            <div style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--t2)', textTransform: 'uppercase' }}>Date</span>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtDateFr(selDate)}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--t2)', textTransform: 'uppercase' }}>Heure</span>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{selSlot}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--t2)', textTransform: 'uppercase' }}>Nom</span>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{client?.name}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--t2)', textTransform: 'uppercase' }}>Type</span>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{bookingType === 'trial' ? "Seance d'essai (15 min)" : 'Seance (25 min)'}</div>
              </div>
            </div>
            <button className="bt bp" onClick={handleConfirm} disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Reservation en cours...' : 'Confirmer la reservation'}
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: 'var(--ok)', marginBottom: 8 }}>&#10003;</div>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Reservation confirmee !</div>
            <div style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 4 }}>
              {fmtDateFr(selDate)} a {selSlot}
            </div>
            {bookingType === 'trial' && (
              <div style={{ fontSize: 12, color: 'var(--wr)', marginBottom: 16 }}>Seance d'essai &mdash; 15 minutes</div>
            )}
            <div style={{ marginBottom: 24 }} />
            <button
              className="bt bp"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={() => { setSelDate(''); setSelSlot(''); setStep('calendar') }}
            >
              Nouvelle reservation
            </button>
            <button
              className="bt bs"
              style={{ width: '100%' }}
              onClick={async () => { setLoading(true); await loadBookings(phone); setLoading(false); setStep('myBookings') }}
            >
              Mes reservations
            </button>
          </div>
        )}

        {/* ── MY BOOKINGS ── */}
        {step === 'myBookings' && (
          <div>
            <button className="bt bs bsm" onClick={() => setStep('menu')} style={{ marginBottom: 12 }}>
              &larr; Retour
            </button>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Mes reservations</div>

            {upcomingBookings.length === 0 && pastBookings.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--t2)', fontSize: 13, padding: '24px 0' }}>
                Aucune reservation
              </div>
            )}

            {upcomingBookings.length > 0 && (
              <div className="bk-my" style={{ marginBottom: 20 }}>
                {upcomingBookings.map(b => (
                  <div className="bk-my-i" key={b.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDateFr(b.date)}</div>
                      <div style={{ fontSize: 12, color: 'var(--t1)' }}>{b.timeSlot} &mdash; {b.type === 'trial' ? "Essai" : "Seance"}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {statusBadge(b)}
                      <button
                        className="bt bs bsm"
                        style={{ fontSize: 10, color: 'var(--er)' }}
                        onClick={() => handleCancel(b)}
                        disabled={loading}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pastBookings.length > 0 && (
              <div>
                <button
                  className="bt bs bsm"
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ fontSize: 12, marginBottom: 8, color: 'var(--t2)' }}
                >
                  {showHistory ? '▾' : '▸'} Historique ({pastBookings.length})
                </button>
                {showHistory && (
                  <div className="bk-my">
                    {pastBookings.map(b => (
                      <div className="bk-my-i past" key={b.id}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDateFr(b.date)}</div>
                          <div style={{ fontSize: 12, color: 'var(--t1)' }}>{b.timeSlot}</div>
                        </div>
                        <div>{statusBadge(b)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
