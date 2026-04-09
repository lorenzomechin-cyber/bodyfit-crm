import { useMemo, Fragment } from 'react'
import { T } from '../lib/i18n'
import { LCOL } from '../lib/constants'
import { daysTo, getDaysInactive, getActiveSuspension, getAdjustedEndDate, waLink, generateSlots, detectLang, waMsg } from '../lib/helpers'
import Icon from '../components/Icon'

const DAY_NAMES = { fr: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"], pt: ["Domingo","Segunda","Terca","Quarta","Quinta","Sexta","Sabado"], en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] }
const MONTH_NAMES = { fr: ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"], pt: ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"], en: ["January","February","March","April","May","June","July","August","September","October","November","December"] }
const MONTH_SHORT = { fr: ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"], pt: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"], en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] }

const SUB_PRICES = { "12m": 89, "6m": 99, "3m": 109, p10: 290, p15: 399, p20: 490, premium: 149 }
const SUB_RECURRING = { "12m": true, "6m": true, "3m": true, premium: true }

export default function Dashboard({ clients, leads, trials, bookings = [], lang, config, user }) {
  const t = T[lang]
  const td = new Date().toISOString().split("T")[0]
  const now = new Date()
  const thr = config && config.thresholds ? config.thresholds : { lowCredits: 3, inactiveDays: 14, expiryDays: 30 }

  const dateStr = useMemo(() => {
    const d = DAY_NAMES[lang] || DAY_NAMES.fr
    const m = MONTH_NAMES[lang] || MONTH_NAMES.fr
    return d[now.getDay()] + " " + now.getDate() + " " + m[now.getMonth()] + " " + now.getFullYear()
  }, [lang])

  const st = useMemo(() => {
    const ac = clients.filter(c => c.status === "active").length
    const ic = clients.filter(c => c.status === "inactive").length
    const sc = clients.filter(c => c.status === "suspended").length
    const tot = clients.length
    const cu = clients.filter(c => c.status === "active").reduce((s, c) => s + (c.used || 0), 0)
    const rn = clients.filter(c => { if (!c.endDate || c.status !== "active") return false; return daysTo(td, getAdjustedEndDate(c)) > 0 && daysTo(td, getAdjustedEndDate(c)) <= thr.expiryDays }).length
    const me = clients.filter(c => !c.email).length
    const lc = clients.filter(c => c.status === "active" && c.rem <= thr.lowCredits).length
    const inact = clients.filter(c => c.status === "active" && getDaysInactive(c) >= thr.inactiveDays).length
    const lT = leads.length
    const lN = leads.filter(l => l.stage === "notContacted").length
    const lB = leads.filter(l => l.stage === "sessionBooked").length
    const lD = leads.filter(l => l.stage === "sessionDone").length
    const lC = leads.filter(l => l.stage === "converted").length
    const cr = lT > 0 ? Math.round(lC / lT * 100) : 0
    return { ac, ic, sc, tot, cu, rn, me, lc, inact, lT, lN, lB, lD, lC, cr }
  }, [clients, leads, thr, td])

  const sessToday = useMemo(() => clients.reduce((n, c) => n + (c.sessions || []).filter(s => s.date === td).length, 0), [clients, td])
  const bookToday = useMemo(() => bookings.filter(b => b.date === td && (b.status === "confirmed" || b.status === "completed")).length, [bookings, td])

  const reviewsThisMonth = useMemo(() => {
    const monthStart = td.substring(0, 7) + '-01'
    return bookings.filter(b => b.reviewRequestedAt && b.reviewRequestedAt >= monthStart).length
  }, [bookings, td])

  // --- NEW: Client growth per month (last 6 months) ---
  const clientGrowth = useMemo(() => {
    const months = []
    const mShort = MONTH_SHORT[lang] || MONTH_SHORT.fr
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().substring(0, 7)
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const count = clients.filter(c => {
        if (!c.startDate) return false
        if (c.startDate > endOfMonth) return false
        if (c.status === 'inactive' && c.endDate && c.endDate < key + '-01') return false
        return true
      }).length
      months.push({ label: mShort[d.getMonth()], count, key })
    }
    return months
  }, [clients, lang])

  // --- NEW: Monthly revenue estimation ---
  const revenueData = useMemo(() => {
    const currentMonth = td.substring(0, 7)
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = prevDate.toISOString().substring(0, 7)

    const calcRevenue = (monthKey) => {
      const monthEnd = new Date(monthKey + '-01')
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      const endStr = monthEnd.toISOString().split('T')[0]
      const startStr = monthKey + '-01'
      let total = 0
      clients.forEach(c => {
        if (!c.sub || !c.startDate) return
        if (c.startDate > endStr) return
        if (c.endDate && c.endDate < startStr) return
        const price = SUB_PRICES[c.sub]
        if (!price) return
        if (SUB_RECURRING[c.sub]) {
          total += price
        } else {
          // One-time packs: count if startDate is in this month
          if (c.startDate >= startStr && c.startDate <= endStr) {
            total += price
          }
        }
      })
      return total
    }

    const current = calcRevenue(currentMonth)
    const previous = calcRevenue(prevMonth)
    const diff = previous > 0 ? Math.round((current - previous) / previous * 100) : (current > 0 ? 100 : 0)
    return { current, previous, diff }
  }, [clients, td])

  // --- NEW: Retention rate (clients with renewalHistory) ---
  const retentionData = useMemo(() => {
    const eligible = clients.filter(c => c.status === 'active' || c.status === 'inactive')
    const retained = eligible.filter(c => c.renewalHistory && c.renewalHistory.length > 0)
    const rate = eligible.length > 0 ? Math.round(retained.length / eligible.length * 100) : 0
    return { rate, retained: retained.length, total: eligible.length }
  }, [clients])

  // --- NEW: Previous month KPI comparisons ---
  const prevMonthStats = useMemo(() => {
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const prevEndStr = prevEnd.toISOString().split('T')[0]
    const prevStartStr = prevDate.toISOString().split('T')[0]

    const prevActive = clients.filter(c => {
      if (!c.startDate) return false
      if (c.startDate > prevEndStr) return false
      if (c.status === 'inactive' && c.endDate && c.endDate < prevStartStr) return false
      return true
    }).length

    const prevBookings = bookings.filter(b => {
      return b.date >= prevStartStr && b.date <= prevEndStr && (b.status === 'confirmed' || b.status === 'completed')
    }).length

    // Average daily sessions previous month
    const daysInPrevMonth = prevEnd.getDate()
    const prevAvgDaily = daysInPrevMonth > 0 ? Math.round(prevBookings / daysInPrevMonth * 10) / 10 : 0

    // This month so far
    const thisMonthStart = td.substring(0, 7) + '-01'
    const thisMonthBookings = bookings.filter(b => {
      return b.date >= thisMonthStart && b.date <= td && (b.status === 'confirmed' || b.status === 'completed')
    }).length
    const daysSoFar = Math.max(1, now.getDate())
    const thisAvgDaily = Math.round(thisMonthBookings / daysSoFar * 10) / 10

    return { prevActive, prevBookings, prevAvgDaily, thisAvgDaily, thisMonthBookings }
  }, [clients, bookings, td])

  // Section 2: Today's timeline
  const todaySlots = useMemo(() => generateSlots(td), [td])
  const todayTimeline = useMemo(() => {
    const dayBookings = bookings.filter(b => b.date === td && b.status !== "cancelled")
    return todaySlots.map(slot => {
      const slotBookings = dayBookings.filter(b => b.timeSlot === slot).sort((a, b) => (a.clientName || "").localeCompare(b.clientName || ""))
      return { slot, bookings: slotBookings }
    })
  }, [todaySlots, bookings, td])

  // Section 3: Urgent actions
  const trialsToFollow = useMemo(() => trials.filter(tr => {
    if (tr.stage === "converted" || tr.stage === "lost") return false
    if (tr.followUpStatus === "noAnswer" || tr.followUpStatus === "msgSent") {
      const lastContact = tr.lastContactDate || tr.trialDate || tr.createdAt
      if (!lastContact) return true
      return daysTo(lastContact, td) > 3
    }
    return false
  }), [trials, td])

  const expiringWeek = useMemo(() => clients.filter(c => c.status === "active" && c.endDate).map(c => { const adj = getAdjustedEndDate(c); const dl = daysTo(td, adj); return { ...c, daysLeft: dl, adjEnd: adj } }).filter(c => c.daysLeft > 0 && c.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft), [clients, td])

  const lowCredits = useMemo(() => clients.filter(c => c.status === "active" && c.sub !== "premium" && c.rem <= 3).sort((a, b) => a.rem - b.rem).slice(0, 8), [clients])

  const noShows = useMemo(() => bookings.filter(b => b.date === td && b.status === "noshow"), [bookings, td])

  const bookingAnalytics = useMemo(() => {
    if (!bookings.length) return null
    const now = new Date()

    // Last 4 weeks data
    const weeks = []
    for (let w = 0; w < 4; w++) {
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - (w * 7))
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekEnd.getDate() - 6)
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]
      const weekBookings = bookings.filter(b => b.date >= startStr && b.date <= endStr && (b.status === 'confirmed' || b.status === 'completed'))
      const noshows = bookings.filter(b => b.date >= startStr && b.date <= endStr && b.status === 'noshow')
      weeks.push({ start: startStr, end: endStr, count: weekBookings.length, noshows: noshows.length, label: 'S' + (4 - w) })
    }
    weeks.reverse()

    // Fill rate by hour (heatmap data)
    const hourCounts = {}
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
    for (let d = 1; d <= 6; d++) { // Mon-Sat
      hourCounts[d] = {}
    }
    bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').forEach(b => {
      const day = new Date(b.date + 'T12:00:00').getDay()
      if (day === 0) return
      const hour = b.timeSlot?.split(':')[0]
      if (!hour) return
      if (!hourCounts[day]) hourCounts[day] = {}
      hourCounts[day][hour] = (hourCounts[day][hour] || 0) + 1
    })

    // No-show rate
    const totalSessions = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'noshow').length
    const totalNoshows = bookings.filter(b => b.status === 'noshow').length
    const noshowRate = totalSessions > 0 ? Math.round(totalNoshows / totalSessions * 100) : 0

    // Trial conversion: count trials that have a matching phone with a normal booking later
    const trialPhones = new Set(bookings.filter(b => b.type === 'trial' && (b.status === 'completed')).map(b => b.clientPhone))
    const convertedTrials = [...trialPhones].filter(phone => bookings.some(b => b.clientPhone === phone && b.type === 'normal')).length
    const trialConversion = trialPhones.size > 0 ? Math.round(convertedTrials / trialPhones.size * 100) : 0

    // Max bar value for chart scaling
    const maxWeekCount = Math.max(...weeks.map(w => w.count), 1)

    return { weeks, hourCounts, dayNames, noshowRate, trialConversion, totalNoshows, totalSessions, maxWeekCount }
  }, [bookings])

  // Section 4 (kept): expiring 30d + funnel
  const expiring = useMemo(() => clients.filter(c => c.status === "active" && c.endDate).map(c => { const adj = getAdjustedEndDate(c); const dl = daysTo(td, adj); return { ...c, daysLeft: dl, adjEnd: adj } }).filter(c => c.daysLeft > 0 && c.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8), [clients, td])

  const stgL = { notContacted: t.notContacted, sessionBooked: t.sessionBooked, sessionDone: t.sessionDone, converted: t.converted, lost: t.lost }
  const subLD = { "12m": t.months12, "6m": t.months6, "3m": t.months3, p10: t.pack10, p15: t.pack15, p20: t.pack20, premium: t.premium }

  const urgentTotal = trialsToFollow.length + expiringWeek.length + lowCredits.length + noShows.length

  // --- SVG mini line chart helper ---
  const renderLineChart = (data, width, height) => {
    if (!data.length) return null
    const max = Math.max(...data.map(d => d.count), 1)
    const min = Math.min(...data.map(d => d.count), 0)
    const range = max - min || 1
    const padY = 20
    const padX = 10
    const chartW = width - padX * 2
    const chartH = height - padY * 2
    const points = data.map((d, i) => ({
      x: padX + (i / Math.max(data.length - 1, 1)) * chartW,
      y: padY + chartH - ((d.count - min) / range) * chartH
    }))
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
    const areaD = pathD + ' L' + points[points.length - 1].x.toFixed(1) + ',' + (height - padY) + ' L' + points[0].x.toFixed(1) + ',' + (height - padY) + ' Z'

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ok)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--ok)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
          <line key={i} x1={padX} x2={width - padX} y1={padY + chartH * (1 - frac)} y2={padY + chartH * (1 - frac)} stroke="var(--bd)" strokeWidth="0.5" strokeDasharray="3,3" />
        ))}
        {/* Area fill */}
        <path d={areaD} fill="url(#lineGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--b2)" stroke="var(--ok)" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="var(--fm)" fill="var(--t0)">{data[i].count}</text>
            <text x={p.x} y={height - 4} textAnchor="middle" fontSize="8" fontFamily="var(--f)" fill="var(--t2)">{data[i].label}</text>
          </g>
        ))}
      </svg>
    )
  }

  // --- SVG donut/ring chart helper ---
  const renderDonut = (percentage, size, strokeWidth, color) => {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference
    const center = size / 2
    return (
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--bd)" strokeWidth={strokeWidth} opacity="0.4" />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${center} ${center})`} style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={center} y={center - 4} textAnchor="middle" fontSize="18" fontWeight="700" fontFamily="var(--fm)" fill="var(--t0)">{percentage}%</text>
        <text x={center} y={center + 12} textAnchor="middle" fontSize="8" fontFamily="var(--f)" fill="var(--t2)" textTransform="uppercase">{lang === 'fr' ? 'retention' : lang === 'pt' ? 'retencao' : 'retention'}</text>
      </svg>
    )
  }

  // --- Trend arrow component ---
  const TrendArrow = ({ current, previous, suffix = '', invert = false }) => {
    if (previous === 0 && current === 0) return null
    const diff = previous > 0 ? Math.round((current - previous) / previous * 100) : (current > 0 ? 100 : 0)
    const isUp = diff > 0
    const isNeutral = diff === 0
    const isPositive = invert ? !isUp : isUp
    if (isNeutral) return <span style={{ fontSize: 9, color: 'var(--t2)', marginLeft: 4 }}>--</span>
    return (
      <span style={{ fontSize: 9, fontWeight: 700, color: isPositive ? 'var(--ok)' : 'var(--er)', marginLeft: 4, fontFamily: 'var(--fm)' }}>
        {isUp ? '\u2191' : '\u2193'}{Math.abs(diff)}{suffix}
      </span>
    )
  }

  // --- Booking heatmap ---
  const renderHeatmap = (hourCounts, dayNames) => {
    if (!hourCounts) return null
    // Collect all hours that appear
    const allHours = new Set()
    Object.values(hourCounts).forEach(dayData => {
      Object.keys(dayData).forEach(h => allHours.add(h))
    })
    const hours = [...allHours].sort()
    if (hours.length === 0) return <p style={{ fontSize: 11, color: 'var(--t2)', textAlign: 'center', padding: '12px 0' }}>--</p>

    // Find max for color scaling
    let maxVal = 0
    Object.values(hourCounts).forEach(dayData => {
      Object.values(dayData).forEach(v => { if (v > maxVal) maxVal = v })
    })

    const days = [1, 2, 3, 4, 5, 6]
    const shortDays = lang === 'fr' ? ['L','M','Me','J','V','S'] : lang === 'pt' ? ['S','T','Q','Q','S','S'] : ['M','T','W','T','F','S']

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `36px repeat(${days.length}, 1fr)`, gap: 2, minWidth: 240 }}>
          {/* Header row */}
          <div />
          {days.map((d, i) => (
            <div key={d} style={{ fontSize: 8, fontWeight: 700, color: 'var(--t2)', textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{shortDays[i]}</div>
          ))}
          {/* Data rows */}
          {hours.map(h => (
            <Fragment key={h}>
              <div style={{ fontSize: 9, fontFamily: 'var(--fm)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>{h}h</div>
              {days.map(d => {
                const val = (hourCounts[d] && hourCounts[d][h]) || 0
                const intensity = maxVal > 0 ? val / maxVal : 0
                const bg = intensity === 0
                  ? 'var(--b1)'
                  : `rgba(45, 140, 90, ${Math.max(0.08, intensity * 0.65)})`
                return (
                  <div key={d} style={{
                    background: bg,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontFamily: 'var(--fm)',
                    fontWeight: 600,
                    color: intensity > 0.5 ? '#fff' : intensity > 0 ? 'var(--ok)' : 'var(--t2)',
                    padding: '5px 2px',
                    minHeight: 22,
                    transition: 'background .3s'
                  }}>
                    {val > 0 ? val : ''}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  // --- KPI card style with gradient ---
  const kpiCardStyle = (gradFrom, gradTo) => ({
    background: `linear-gradient(135deg, ${gradFrom} 0%, var(--b2) 100%)`,
    border: '1px solid var(--bd)',
    borderRadius: 'var(--r)',
    padding: 16,
    transition: 'all .15s',
    position: 'relative',
    overflow: 'hidden'
  })

  const kpiGradients = [
    { from: 'rgba(44,44,44,.04)', to: 'var(--b2)' },       // sessions today
    { from: 'rgba(46,109,164,.04)', to: 'var(--b2)' },      // bookings
    { from: 'rgba(45,140,90,.04)', to: 'var(--b2)' },       // active
    { from: 'rgba(192,57,43,.04)', to: 'var(--b2)' },       // renewals
    { from: 'rgba(46,109,164,.04)', to: 'var(--b2)' },      // low credits
    { from: 'rgba(196,127,23,.04)', to: 'var(--b2)' },      // suspended
    { from: 'rgba(45,140,90,.04)', to: 'var(--b2)' },       // reviews
  ]

  const kpiCards = [
    { l: t.sessionsToday, v: sessToday, c: "sv-ac", prev: prevMonthStats.prevAvgDaily, curr: prevMonthStats.thisAvgDaily },
    { l: t.todayBookings || "Reservations", v: bookToday, c: "sv-inf" },
    { l: t.activeClients, v: st.ac, c: "sv-ok", s: st.tot + " " + t.totalClients, prev: prevMonthStats.prevActive, curr: st.ac },
    { l: t.upcomingRenewals, v: st.rn, c: "sv-er" },
    { l: t.lowCredits, v: st.lc, c: "sv-inf", invert: true },
    { l: t.suspendedClients, v: st.sc, c: "sv-wr", invert: true },
    { l: t.reviewsRequested, v: reviewsThisMonth, c: "sv-ok" }
  ]

  return (
    <div className="fin">
      {/* Section 1: Greeting + date + KPI cards */}
      <div className="ph">
        <h2>{t.goodMorning} {user ? user.username : ""}</h2>
        <p style={{ fontSize: 12, color: "var(--t2)", textTransform: "capitalize" }}>{dateStr}
          <span style={{ fontSize: 9, color: "var(--t2)", fontFamily: "var(--fm)", marginLeft: 8 }}>
            {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </p>
      </div>

      {/* KPI cards with gradients and trend arrows */}
      <div className="cg">
        {kpiCards.map((x, i) =>
          <div key={i} style={kpiCardStyle(kpiGradients[i % kpiGradients.length].from, kpiGradients[i % kpiGradients.length].to)}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: kpiGradients[i % kpiGradients.length].from.replace('.04', '.06'), borderRadius: '0 0 0 60px', opacity: 0.5 }} />
            <div className="sl">{x.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <div className={"sv " + (x.c || "")}>{x.v}</div>
              {x.prev !== undefined && x.curr !== undefined && <TrendArrow current={x.curr} previous={x.prev} suffix="%" invert={x.invert} />}
            </div>
            {x.s ? <div className="ss">{x.s}</div> : null}
          </div>
        )}
      </div>

      {/* NEW: Charts section - 2 column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, marginBottom: 20 }}>

        {/* Client growth line chart */}
        <div className="cd">
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon n="activity" s={13} />
            {lang === 'fr' ? 'Croissance clients' : lang === 'pt' ? 'Crescimento clientes' : 'Client Growth'}
            <span style={{ fontSize: 9, color: 'var(--t2)', fontWeight: 400, marginLeft: 'auto' }}>
              {lang === 'fr' ? '6 derniers mois' : lang === 'pt' ? 'ultimos 6 meses' : 'last 6 months'}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            {renderLineChart(clientGrowth, 320, 140)}
          </div>
        </div>

        {/* Revenue estimation + Retention donut */}
        <div className="cd">
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon n="zap" s={13} />
            {lang === 'fr' ? 'Revenu & Retention' : lang === 'pt' ? 'Receita & Retencao' : 'Revenue & Retention'}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
            {/* Revenue block */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--t2)', fontWeight: 600, marginBottom: 6 }}>
                {lang === 'fr' ? 'Revenu estimé' : lang === 'pt' ? 'Receita estimada' : 'Est. Revenue'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 28, fontWeight: 700, color: 'var(--ok)' }}>
                  {revenueData.current.toLocaleString('fr-FR')}&euro;
                </span>
                <span style={{ fontSize: 9, color: 'var(--t2)' }}>/mo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--t2)' }}>
                  {lang === 'fr' ? 'Mois préc.' : lang === 'pt' ? 'Mes anterior' : 'Prev. month'}: {revenueData.previous.toLocaleString('fr-FR')}&euro;
                </span>
                <TrendArrow current={revenueData.current} previous={revenueData.previous} suffix="%" />
              </div>
              {/* Revenue breakdown hint */}
              <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(SUB_PRICES).map(([k, v]) => {
                  const count = clients.filter(c => c.sub === k && c.status === 'active').length
                  if (count === 0) return null
                  return (
                    <span key={k} style={{
                      fontSize: 8,
                      padding: '2px 6px',
                      borderRadius: 8,
                      background: 'var(--b1)',
                      color: 'var(--t1)',
                      fontFamily: 'var(--fm)',
                      fontWeight: 600
                    }}>
                      {k}: {count}
                    </span>
                  )
                })}
              </div>
            </div>
            {/* Retention donut */}
            <div style={{ flexShrink: 0 }}>
              {renderDonut(retentionData.rate, 100, 8, 'var(--ok)')}
              <div style={{ textAlign: 'center', marginTop: 4, fontSize: 8, color: 'var(--t2)' }}>
                {retentionData.retained}/{retentionData.total}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Today's sessions timeline */}
      <div className="cd" style={{ marginBottom: 16 }}>
        <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="cal" s={13} />{t.todaySessions} ({bookToday})</div>
        {todaySlots.length === 0 ? <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.closedDay}</p> :
          bookToday === 0 ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 8 }}>
            <Icon n="cal" s={28} style={{ opacity: 0.25 }} />
            <p style={{ fontSize: 11, color: "var(--t2)", margin: 0 }}>{t.noBookingsToday}</p>
          </div> :
          <div style={{ padding: "4px 0" }}>
            {todayTimeline.map(({ slot, bookings: slotBk }) => (
              <div key={slot} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--bd)", opacity: slotBk.length === 0 ? 0.4 : 1 }}>
                <div style={{ width: 42, fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: "var(--ac2)", flexShrink: 0, paddingTop: 2 }}>{slot}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {slotBk.length === 0 ? <span style={{ fontSize: 10, color: "var(--t2)", fontStyle: "italic" }}>&mdash;</span> :
                    slotBk.map(b => {
                      const reminderWa = b.clientPhone ? waLink(b.clientPhone, waMsg('todayReminder', detectLang(b.clientPhone), b.clientName || '', b.timeSlot)) : null
                      return <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: slotBk.length > 1 ? 3 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{b.clientName || "--"}</span>
                        <span className="bg" style={{ background: b.type === "trial" ? "var(--wrg)" : "var(--infg)", color: b.type === "trial" ? "var(--wr)" : "var(--inf)", fontSize: 8 }}>{b.type === "trial" ? t.sessionTrial : t.sessionNormal}</span>
                        <span className="bg" style={{ background: b.status === "completed" ? "var(--okg)" : b.status === "noshow" ? "var(--erg)" : "var(--acg)", color: b.status === "completed" ? "var(--ok)" : b.status === "noshow" ? "var(--er)" : "var(--ac2)", fontSize: 8 }}>{t["booking" + b.status.charAt(0).toUpperCase() + b.status.slice(1)] || b.status}</span>
                        {reminderWa ? <a href={reminderWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}><Icon n="wa" s={13} /></a> : null}
                      </div>
                    })
                  }
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Section 3: Urgent actions */}
      <div className="cd" style={{ marginBottom: 16 }}>
        <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon n="alert" s={13} />{t.urgentActions}
          {urgentTotal > 0 && <span style={{ fontFamily: 'var(--fm)', fontSize: 9, fontWeight: 700, background: 'var(--er)', color: '#fff', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>{urgentTotal}</span>}
        </div>

        {noShows.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--er)", padding: "6px 0 2px" }}>{t.noShowsToday} ({noShows.length})</div>
          {noShows.map(b => {
            const nsWa = b.clientPhone ? waLink(b.clientPhone, waMsg('noshow', detectLang(b.clientPhone), b.clientName || '')) : null
            return <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.clientName}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{b.timeSlot} {b.type === "trial" ? `(${t.sessionTrial})` : ""}</div></div>
              {nsWa ? <a href={nsWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600 }}><Icon n="wa" s={12} />{t.noShowFollowUp}</a> : null}
            </div>
          })}
        </>}

        {expiringWeek.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--er)", padding: "6px 0 2px" }}>{t.expiringThisWeek} ({expiringWeek.length})</div>
          {expiringWeek.map(c => {
            const ewWa = c.phone ? waLink(c.phone, waMsg('renewalAlert', c.lang || detectLang(c.phone), c.name || '', c.daysLeft)) : null
            return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{subLD[c.sub]} &mdash; {c.adjEnd}</div></div>
              <span className="freq-badge" style={{ background: "var(--erg)", color: "var(--er)" }}>{c.daysLeft}{t.daysLeft}</span>
              {ewWa ? <a href={ewWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}><Icon n="wa" s={12} /></a> : null}
            </div>
          })}
        </>}

        {trialsToFollow.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--wr)", padding: "6px 0 2px" }}>{t.trialsToFollow} ({trialsToFollow.length})</div>
          {trialsToFollow.map(tr => {
            const dsc = tr.lastContactDate ? daysTo(tr.lastContactDate, td) : "?"
            const trWa = tr.phone ? waLink(tr.phone, waMsg('trialFollowUp', tr.lang || detectLang(tr.phone), tr.name || '')) : null
            return <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{t.daysSinceContact}: {dsc}{typeof dsc === "number" ? "j" : ""} &middot; {t[tr.followUpStatus] || tr.followUpStatus}</div></div>
              {trWa ? <a href={trWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600 }}><Icon n="wa" s={12} /></a> : null}
            </div>
          })}
        </>}

        {lowCredits.length > 0 && <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--wr)", padding: "6px 0 2px" }}>{t.lowCredits} ({lowCredits.length})</div>
          {lowCredits.map(c => {
            const lcWa = c.phone ? waLink(c.phone, waMsg('lowCredits', c.lang || detectLang(c.phone), c.name || '', c.rem)) : null
            return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{c.rem} {t.creditsRemaining}</div></div>
              {lcWa ? <a href={lcWa} target="_blank" rel="noopener" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}><Icon n="wa" s={12} /></a> : null}
            </div>
          })}
        </>}

        {urgentTotal === 0 && <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.noNoShows}</p>}
      </div>

      {/* Section 4: Funnel overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, marginBottom: 20 }}>
        <div className="cd">
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon n="clock" s={13} />{t.expiringClients} ({expiring.length})</div>
          {expiring.length === 0 ? <p style={{ fontSize: 11, color: "var(--t2)", padding: "12px 0", textAlign: "center" }}>{t.noExpiring}</p> :
            expiring.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "var(--t2)" }}>{subLD[c.sub]} &mdash; {c.adjEnd}</div></div>
              <span className="freq-badge" style={{ background: c.daysLeft <= 7 ? "var(--erg)" : "var(--wrg)", color: c.daysLeft <= 7 ? "var(--er)" : "var(--wr)" }}>{c.daysLeft}{t.daysLeft}</span>
            </div>)}
        </div>

        <div className="cd"><div className="cht">{t.funnelOverview}</div><div className="fnl">
          {[{ k: "notContacted", c: "#6B6560", v: st.lN }, { k: "sessionBooked", c: "#C47F17", v: st.lB }, { k: "sessionDone", c: "#2E6DA4", v: st.lD }, { k: "converted", c: "#2D8C5A", v: st.lC }].map(item => (
            <div key={item.k} className="fns"><span className="fnl2">{t[item.k]}</span><div className="fnb" style={{ width: (st.lT > 0 ? Math.max(item.v / st.lT * 100, 8) : 8) + "%", background: item.c }}><span className="fnv">{item.v}</span></div></div>
          ))}
        </div><div style={{ textAlign: "center", marginTop: 6 }}><span style={{ fontFamily: "var(--fm)", fontSize: 18, fontWeight: 700, color: "var(--ok)" }}>{st.cr}%</span><span style={{ fontSize: 10, color: "var(--t2)", marginLeft: 5 }}>{t.conversionRate}</span></div></div>
      </div>

      {/* Booking Analytics */}
      {bookingAnalytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, marginBottom: 20 }}>

          {/* Weekly sessions chart */}
          <div className="cd">
            <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon n="activity" s={13} />{t.sessionsPerWeek}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, marginTop: 10 }}>
              {bookingAnalytics.weeks.map((w, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--fm)", fontWeight: 700, color: "var(--t0)" }}>{w.count}</span>
                  <div style={{
                    width: "100%",
                    borderRadius: 4,
                    height: Math.max(4, (w.count / bookingAnalytics.maxWeekCount) * 80),
                    transition: "height .5s ease",
                    background: `linear-gradient(180deg, var(--ok) 0%, rgba(45,140,90,.6) 100%)`
                  }} />
                  <span style={{ fontSize: 9, color: "var(--t2)" }}>{w.label}</span>
                </div>
              ))}
            </div>
            {bookingAnalytics.weeks.some(w => w.noshows > 0) && (
              <div style={{ marginTop: 8, fontSize: 10, color: "var(--t2)" }}>
                {t.absences}: {bookingAnalytics.weeks.map(w => w.noshows).join(" \u00b7 ")}
              </div>
            )}
          </div>

          {/* KPI cards */}
          <div className="cd">
            <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon n="grid" s={13} />{t.keyIndicators}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div style={{ textAlign: "center", padding: 10, background: bookingAnalytics.noshowRate > 10 ? 'var(--erg)' : 'var(--okg)', borderRadius: 'var(--rs)' }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: bookingAnalytics.noshowRate > 10 ? "var(--er)" : "var(--ok)" }}>{bookingAnalytics.noshowRate}%</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>{t.noShowRate}</div>
              </div>
              <div style={{ textAlign: "center", padding: 10, background: bookingAnalytics.trialConversion > 50 ? 'var(--okg)' : 'var(--wrg)', borderRadius: 'var(--rs)' }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: bookingAnalytics.trialConversion > 50 ? "var(--ok)" : "var(--wr)" }}>{bookingAnalytics.trialConversion}%</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>{t.trialConversion}</div>
              </div>
              <div style={{ textAlign: "center", padding: 10, background: 'var(--infg)', borderRadius: 'var(--rs)' }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: "var(--inf)" }}>{bookingAnalytics.totalSessions}</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>{t.totalSessions}</div>
              </div>
              <div style={{ textAlign: "center", padding: 10, background: 'var(--erg)', borderRadius: 'var(--rs)' }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: "var(--er)" }}>{bookingAnalytics.totalNoshows}</div>
                <div style={{ fontSize: 10, color: "var(--t2)" }}>{t.totalAbsences}</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* NEW: Booking Heatmap */}
      {bookingAnalytics && bookingAnalytics.hourCounts && (
        <div className="cd" style={{ marginBottom: 20 }}>
          <div className="cht" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon n="grid" s={13} />
            {lang === 'fr' ? 'Heures de pointe' : lang === 'pt' ? 'Horarios de pico' : 'Peak Hours'}
            <span style={{ fontSize: 9, color: 'var(--t2)', fontWeight: 400, marginLeft: 'auto' }}>
              {lang === 'fr' ? 'Intensite par jour/heure' : lang === 'pt' ? 'Intensidade por dia/hora' : 'Intensity by day/hour'}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            {renderHeatmap(bookingAnalytics.hourCounts, bookingAnalytics.dayNames)}
          </div>
        </div>
      )}
    </div>
  )
}
