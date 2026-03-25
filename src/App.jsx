import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase, sbLoadAll, sbUpsert, sbDelete, sbDeleteAll, dbToClient, clientToDb, dbToLead, leadToDb, dbToTrial, trialToDb, dbToBooking, bookingToDb } from './lib/supabase'
import { T } from './lib/i18n'
import { SUB, SOURCES } from './lib/constants'
import { mkClients, mkLeads, mkTrials } from './lib/sampleData'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Icon from './components/Icon'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const LeadsMetaPage = lazy(() => import('./pages/LeadsMetaPage'))
const TrialsPage = lazy(() => import('./pages/TrialsPage'))
const NutritionPage = lazy(() => import('./pages/NutritionPage'))
const Settings = lazy(() => import('./pages/Settings'))
const PlanningPage = lazy(() => import('./pages/PlanningPage'))
const BookingPublic = lazy(() => import('./pages/BookingPublic'))

export default function App() {
  const [isPublicBooking] = useState(() => window.location.hash === "#book")
  const [user, sUser] = useState(null)
  const [lang, sLang] = useState("fr")
  const [pg, sPg] = useState("dashboard")
  const [clients, sClients] = useState([])
  const [leads, sLeads] = useState([])
  const [trials, sTrials] = useState([])
  const [bookings, sBookings] = useState([])
  const [sbO, sSbO] = useState(false)
  const [init, sInit] = useState(false)
  const defaultCfg = {
    subs: SUB,
    sources: SOURCES,
    thresholds: { lowCredits: 3, inactiveDays: 14, expiryDays: 30 }
  }
  const [config, sConfig] = useState(defaultCfg)
  const t = T[lang]

  useEffect(() => {
    (async () => {
      try {
        const c = await sbLoadAll("clients", dbToClient); sClients(c.length ? c : mkClients())
        const l = await sbLoadAll("leads", dbToLead); sLeads(l.length ? l : mkLeads())
        const tr = await sbLoadAll("trials", dbToTrial); sTrials(tr.length ? tr : mkTrials())
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const minDate = thirtyDaysAgo.toISOString().split("T")[0]
        const bkRes = await supabase.from("bookings").select("*").gte("date", minDate)
        sBookings((bkRes.data || []).map(dbToBooking))
        const cfgRes = await supabase.from("config").select("data").eq("id", "main").single()
        if (cfgRes.data && cfgRes.data.data) sConfig(cfgRes.data.data)
      } catch (e) {
        console.error("Load error", e)
      }
      try { const u = localStorage.getItem("bf-user"); if (u) sUser(JSON.parse(u)) } catch (e) {}
      try { const lg = localStorage.getItem("bf-lang"); if (lg) sLang(lg) } catch (e) {}
      sInit(true)
    })()
  }, [])

  const saveTimer = useRef({})
  function debouncedSync(key, fn, delay) {
    clearTimeout(saveTimer.current[key])
    saveTimer.current[key] = setTimeout(fn, delay || 800)
  }

  useEffect(() => {
    if (!init) return
    debouncedSync("clients", async () => {
      const existing = await sbLoadAll("clients", dbToClient)
      const currentIds = new Set(clients.map(c => c.id))
      existing.forEach(e => { if (!currentIds.has(e.id)) sbDelete("clients", e.id) })
      if (clients.length > 0) await supabase.from("clients").upsert(clients.map(clientToDb), { onConflict: "id" })
    })
  }, [clients, init])

  useEffect(() => {
    if (!init) return
    debouncedSync("leads", async () => {
      const existing = await sbLoadAll("leads", dbToLead)
      const currentIds = new Set(leads.map(l => l.id))
      existing.forEach(e => { if (!currentIds.has(e.id)) sbDelete("leads", e.id) })
      if (leads.length > 0) await supabase.from("leads").upsert(leads.map(leadToDb), { onConflict: "id" })
    })
  }, [leads, init])

  useEffect(() => {
    if (!init) return
    debouncedSync("trials", async () => {
      const existing = await sbLoadAll("trials", dbToTrial)
      const currentIds = new Set(trials.map(t2 => t2.id))
      existing.forEach(e => { if (!currentIds.has(e.id)) sbDelete("trials", e.id) })
      if (trials.length > 0) await supabase.from("trials").upsert(trials.map(trialToDb), { onConflict: "id" })
    })
  }, [trials, init])

  // Bookings sync: upsert-only (no delete loop) because public booking page creates bookings independently
  useEffect(() => {
    if (!init) return
    debouncedSync("bookings", async () => {
      if (bookings.length > 0) {
        await supabase.from("bookings").upsert(bookings.map(bookingToDb), { onConflict: "id" })
      }
    })
  }, [bookings, init])

  // Poll bookings from DB every 30s to pick up public bookings
  useEffect(() => {
    if (!init) return
    const iv = setInterval(async () => {
      try {
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const minDate = thirtyDaysAgo.toISOString().split("T")[0]
        const bkRes = await supabase.from("bookings").select("*").gte("date", minDate)
        const remote = (bkRes.data || []).map(dbToBooking)
        sBookings(prev => {
          const remoteMap = new Map(remote.map(b => [b.id, b]))
          const localMap = new Map(prev.map(b => [b.id, b]))
          // Merge: keep whichever has newer updatedAt, add new remote ones
          const merged = new Map()
          for (const [id, rb] of remoteMap) {
            const lb = localMap.get(id)
            if (!lb) { merged.set(id, rb) }
            else if ((rb.updatedAt || '') >= (lb.updatedAt || '')) { merged.set(id, rb) }
            else { merged.set(id, lb) }
          }
          // Keep local-only bookings (not yet synced)
          for (const [id, lb] of localMap) {
            if (!merged.has(id)) merged.set(id, lb)
          }
          return [...merged.values()]
        })
      } catch (e) { console.error("Booking poll error", e) }
    }, 30000)
    return () => clearInterval(iv)
  }, [init])

  useEffect(() => {
    if (!init) return
    debouncedSync("config", async () => {
      await supabase.from("config").upsert({ id: "main", data: config, updated_at: new Date().toISOString() })
    })
  }, [config, init])

  useEffect(() => {
    if (!init) return
    try { localStorage.setItem("bf-lang", lang) } catch (e) {}
  }, [lang, init])

  const login = (u, l) => {
    sUser(u); sLang(l)
    try { localStorage.setItem("bf-user", JSON.stringify(u)); localStorage.setItem("bf-lang", l) } catch (e) {}
  }
  const logout = async () => {
    await supabase.auth.signOut()
    sUser(null)
    try { localStorage.removeItem("bf-user") } catch (e) {}
  }
  const lN = leads.filter(l => l.stage === "notContacted").length
  const trN = trials.filter(tr => tr.stage !== "converted" && (!tr.followUpStatus || tr.followUpStatus === "noAnswer" || tr.followUpStatus === "msgSent")).length

  const fallback = <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--b0)", color: "var(--t2)" }}><h1 style={{ fontFamily: "var(--fm)", fontSize: 18 }}>BODY<em style={{ color: "var(--ac)", fontStyle: "normal" }}>FIT</em></h1></div>

  if (isPublicBooking) return <Suspense fallback={fallback}><BookingPublic /></Suspense>

  if (!init) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--b0)", color: "var(--t2)" }}>
      <h1 style={{ fontFamily: "var(--fm)", fontSize: 18 }}>BODY<em style={{ color: "var(--ac)", fontStyle: "normal" }}>FIT</em></h1>
    </div>
  )
  if (!user) return <Login onLogin={login} />

  return (
    <>
      <div className="app">
        <button className="mob" onClick={() => sSbO(!sbO)}><Icon n={sbO ? "x" : "filter"} s={16} /></button>
        <Sidebar page={pg} setPage={sPg} user={user} onLogout={logout} lang={lang} setLang={sLang} leadCount={lN} trialCount={trN} isOpen={sbO} onClose={() => sSbO(false)} />
        <main className="mn"><div className="pg">
          <Suspense fallback={fallback}>
            {pg === "dashboard" && <Dashboard clients={clients} leads={leads} trials={trials} bookings={bookings} lang={lang} config={config} user={user} />}
            {pg === "clients" && <ClientsPage clients={clients} setClients={sClients} trials={trials} setTrials={sTrials} bookings={bookings} lang={lang} role={user.role} />}
            {pg === "leads" && <LeadsMetaPage leads={leads} setLeads={sLeads} trials={trials} setTrials={sTrials} lang={lang} role={user.role} />}
            {pg === "trials" && <TrialsPage trials={trials} setTrials={sTrials} clients={clients} setClients={sClients} lang={lang} role={user.role} />}
            {pg === "planning" && <PlanningPage bookings={bookings} setBookings={sBookings} clients={clients} lang={lang} trials={trials} setTrials={sTrials} />}
            {pg === "nutrition" && <NutritionPage lang={lang} />}
            {pg === "settings" && <Settings lang={lang} sLang={sLang} user={user} config={config} sConfig={sConfig} clients={clients} leads={leads} trials={trials} sClients={sClients} sLeads={sLeads} sTrials={sTrials} onLoad={() => { sClients(mkClients()); sLeads(mkLeads()); sTrials(mkTrials()) }} onReset={async () => { sClients([]); sLeads([]); sTrials([]); await sbDeleteAll("clients"); await sbDeleteAll("leads"); await sbDeleteAll("trials") }} />}
          </Suspense>
        </div></main>
      </div>
      {sbO && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", zIndex: 99 }} onClick={() => sSbO(false)} />}
    </>
  )
}
