import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { supabase, sbLoadAll, sbDeleteAll, dbToClient, clientToDb, dbToLead, leadToDb, dbToTrial, trialToDb, dbToBooking, bookingToDb } from './lib/supabase'
import { T } from './lib/i18n'
import { SUB, SOURCES } from './lib/constants'
import { mkClients, mkLeads, mkTrials } from './lib/sampleData'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Icon from './components/Icon'
import ErrorBoundary from './components/ErrorBoundary'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const LeadsMetaPage = lazy(() => import('./pages/LeadsMetaPage'))
const TrialsPage = lazy(() => import('./pages/TrialsPage'))
const NutritionPage = lazy(() => import('./pages/NutritionPage'))
const Settings = lazy(() => import('./pages/Settings'))
const PlanningPage = lazy(() => import('./pages/PlanningPage'))
export default function App() {
  const [user, sUser] = useState(null)
  const [lang, sLang] = useState("fr")
  const [pg, sPg] = useState("dashboard")
  const [clients, sClients] = useState([])
  const [leads, sLeads] = useState([])
  const [trials, sTrials] = useState([])
  const [bookings, sBookings] = useState([])
  const [sbO, sSbO] = useState(false)
  const [init, sInit] = useState(false)
  const [authReady, sAuthReady] = useState(false)
  const [toast, sToast] = useState(null)
  const defaultCfg = {
    subs: SUB,
    sources: SOURCES,
    thresholds: { lowCredits: 3, inactiveDays: 14, expiryDays: 30 }
  }
  const [config, sConfig] = useState(defaultCfg)
  const t = T[lang]

  // Toast notification system
  const toastTimer = useRef(null)
  function showToast(msg, type) {
    sToast({ msg, type: type || "error" })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => sToast(null), 4000)
  }

  // Load all data from Supabase (called after auth is confirmed)
  const loadData = useCallback(async () => {
    let hasError = false
    try {
      const c = await sbLoadAll("clients", dbToClient); sClients(c)
      const l = await sbLoadAll("leads", dbToLead); sLeads(l)
      const tr = await sbLoadAll("trials", dbToTrial); sTrials(tr)
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const minDate = thirtyDaysAgo.toISOString().split("T")[0]
      const bkRes = await supabase.from("bookings").select("*").gte("date", minDate)
      if (bkRes.error) hasError = true
      sBookings((bkRes.data || []).map(dbToBooking))
      const cfgRes = await supabase.from("config").select("data").eq("id", "main").single()
      if (cfgRes.data && cfgRes.data.data) sConfig(cfgRes.data.data)
    } catch (e) {
      hasError = true
    }
    if (hasError) showToast(t.syncLoadError || "Erreur de chargement des donnees", "error")
    sInit(true)
  }, [t])

  // Wait for Supabase auth session to be ready before loading data
  useEffect(() => {
    // Restore lang from localStorage immediately
    try { const lg = localStorage.getItem("bf-lang"); if (lg) sLang(lg) } catch (e) {}

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = { username: session.user.email, role: 'admin', name: session.user.email.split('@')[0], id: session.user.id }
        sUser(u)
      } else {
        sUser(null)
      }
      sAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load data once auth is ready
  useEffect(() => {
    if (!authReady) return
    loadData()
  }, [authReady, loadData])

  // Sync helpers — upsert only, NO destructive deletes, with error feedback
  const saveTimer = useRef({})
  const pendingSyncs = useRef({})
  function debouncedSync(key, fn, delay) {
    clearTimeout(saveTimer.current[key])
    pendingSyncs.current[key] = fn
    saveTimer.current[key] = setTimeout(async () => {
      delete pendingSyncs.current[key]
      try {
        await fn()
      } catch (e) {

        showToast(t.syncSaveError || "Erreur de sauvegarde", "error")
      }
    }, delay || 800)
  }

  // Flush all pending syncs immediately (fire requests, don't await)
  function flushSyncs() {
    Object.keys(saveTimer.current).forEach(k => clearTimeout(saveTimer.current[k]))
    Object.values(pendingSyncs.current).forEach(fn => { try { fn() } catch (e) {} })
    pendingSyncs.current = {}
  }

  // Flush pending syncs on visibility change (more reliable than beforeunload)
  useEffect(() => {
    const handleVisChange = () => { if (document.visibilityState === "hidden") flushSyncs() }
    const handleUnload = () => flushSyncs()
    document.addEventListener("visibilitychange", handleVisChange)
    window.addEventListener("beforeunload", handleUnload)
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange)
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [])

  useEffect(() => {
    if (!init) return
    debouncedSync("clients", async () => {
      if (clients.length > 0) {
        const res = await supabase.from("clients").upsert(clients.map(clientToDb), { onConflict: "id" })
        if (res.error) showToast(t.syncSaveError || "Erreur de sauvegarde clients", "error")
      }
    })
  }, [clients, init])

  useEffect(() => {
    if (!init) return
    debouncedSync("leads", async () => {
      if (leads.length > 0) {
        const res = await supabase.from("leads").upsert(leads.map(leadToDb), { onConflict: "id" })
        if (res.error) showToast(t.syncSaveError || "Erreur de sauvegarde leads", "error")
      }
    })
  }, [leads, init])

  useEffect(() => {
    if (!init) return
    debouncedSync("trials", async () => {
      if (trials.length > 0) {
        const res = await supabase.from("trials").upsert(trials.map(trialToDb), { onConflict: "id" })
        if (res.error) showToast(t.syncSaveError || "Erreur de sauvegarde essais", "error")
      }
    })
  }, [trials, init])

  // Bookings sync: upsert-only
  useEffect(() => {
    if (!init) return
    debouncedSync("bookings", async () => {
      if (bookings.length > 0) {
        const res = await supabase.from("bookings").upsert(bookings.map(bookingToDb), { onConflict: "id" })
        if (res.error) showToast(t.syncSaveError || "Erreur de sauvegarde reservations", "error")
      }
    })
  }, [bookings, init])

  // Poll bookings from DB every 30s to pick up public bookings
  useEffect(() => {
    if (!init) return
    const iv = setInterval(async () => {
      if (pendingSyncs.current["bookings"]) return
      try {
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const minDate = thirtyDaysAgo.toISOString().split("T")[0]
        const bkRes = await supabase.from("bookings").select("*").gte("date", minDate)
        const remote = (bkRes.data || []).map(dbToBooking)
        sBookings(prev => {
          const remoteMap = new Map(remote.map(b => [b.id, b]))
          const localMap = new Map(prev.map(b => [b.id, b]))
          const merged = new Map()
          for (const [id, rb] of remoteMap) {
            const lb = localMap.get(id)
            if (!lb) { merged.set(id, rb) }
            else if ((rb.updatedAt || '') >= (lb.updatedAt || '')) { merged.set(id, rb) }
            else { merged.set(id, lb) }
          }
          for (const [id, lb] of localMap) {
            if (!merged.has(id)) merged.set(id, lb)
          }
          return [...merged.values()]
        })
      } catch (e) { /* poll error — silent retry next interval */ }
    }, 30000)
    return () => clearInterval(iv)
  }, [init])

  // Poll clients from DB every 30s to sync across devices
  useEffect(() => {
    if (!init) return
    const iv = setInterval(async () => {
      if (pendingSyncs.current["clients"]) return
      try {
        const remote = await sbLoadAll("clients", dbToClient)
        sClients(prev => {
          const remoteMap = new Map(remote.map(c => [c.id, c]))
          for (const c of prev) if (!remoteMap.has(c.id)) remoteMap.set(c.id, c)
          return [...remoteMap.values()]
        })
      } catch (e) { /* poll error — silent retry next interval */ }
    }, 30000)
    return () => clearInterval(iv)
  }, [init])

  // Poll leads from DB every 30s to sync across devices
  useEffect(() => {
    if (!init) return
    const iv = setInterval(async () => {
      if (pendingSyncs.current["leads"]) return
      try {
        const remote = await sbLoadAll("leads", dbToLead)
        sLeads(prev => {
          const remoteMap = new Map(remote.map(l => [l.id, l]))
          for (const l of prev) if (!remoteMap.has(l.id)) remoteMap.set(l.id, l)
          return [...remoteMap.values()]
        })
      } catch (e) { /* poll error — silent retry next interval */ }
    }, 30000)
    return () => clearInterval(iv)
  }, [init])

  // Poll trials from DB every 30s to sync across devices
  useEffect(() => {
    if (!init) return
    const iv = setInterval(async () => {
      if (pendingSyncs.current["trials"]) return
      try {
        const remote = await sbLoadAll("trials", dbToTrial)
        sTrials(prev => {
          const remoteMap = new Map(remote.map(tr => [tr.id, tr]))
          for (const tr of prev) if (!remoteMap.has(tr.id)) remoteMap.set(tr.id, tr)
          return [...remoteMap.values()]
        })
      } catch (e) { /* poll error — silent retry next interval */ }
    }, 30000)
    return () => clearInterval(iv)
  }, [init])

  useEffect(() => {
    if (!init) return
    debouncedSync("config", async () => {
      const res = await supabase.from("config").upsert({ id: "main", data: config, updated_at: new Date().toISOString() })
      if (res.error) showToast("Erreur config", "error")
    })
  }, [config, init])

  useEffect(() => {
    if (!init) return
    try { localStorage.setItem("bf-lang", lang) } catch (e) {}
  }, [lang, init])

  const login = (u, l) => {
    sUser(u); sLang(l)
    try { localStorage.setItem("bf-user", JSON.stringify(u)); localStorage.setItem("bf-lang", l) } catch (e) {}
    // Reload data now that user is authenticated
    loadData()
  }
  const logout = async () => {
    await supabase.auth.signOut()
    sUser(null)
    sClients([]); sLeads([]); sTrials([]); sBookings([])
    sInit(false)
    try { localStorage.removeItem("bf-user") } catch (e) {}
  }
  const lN = leads.filter(l => l.stage === "notContacted").length
  const trN = trials.filter(tr => tr.stage !== "converted" && (!tr.followUpStatus || tr.followUpStatus === "noAnswer" || tr.followUpStatus === "msgSent")).length
  const bkToday = bookings.filter(b => b.date === new Date().toISOString().split("T")[0] && (b.status === "confirmed" || b.status === "completed")).length

  const fallback = <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--b0)", color: "var(--t2)" }}><h1 style={{ fontFamily: "var(--fm)", fontSize: 18 }}>BODY<em style={{ color: "var(--ac)", fontStyle: "normal" }}>FIT</em></h1></div>

  // Toast component
  const toastEl = toast ? <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "var(--er)" : "var(--ok)", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.15)", animation: "fIn .2s ease", display: "flex", alignItems: "center", gap: 8, maxWidth: 360 }}><Icon n={toast.type === "error" ? "x" : "check"} s={14} />{toast.msg}</div> : null

  if (!authReady || (!user && !init)) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--b0)", color: "var(--t2)" }}>
      <h1 style={{ fontFamily: "var(--fm)", fontSize: 18 }}>BODY<em style={{ color: "var(--ac)", fontStyle: "normal" }}>FIT</em></h1>
    </div>
  )
  if (!user) return <Login onLogin={login} />

  return (
    <>
      <div className="app">
        <button className="mob" onClick={() => sSbO(!sbO)}><Icon n={sbO ? "x" : "filter"} s={16} /></button>
        <Sidebar page={pg} setPage={sPg} user={user} onLogout={logout} lang={lang} setLang={sLang} leadCount={lN} trialCount={trN} bookingCount={bkToday} isOpen={sbO} onClose={() => sSbO(false)} />
        <main className="mn"><div className="pg">
          <ErrorBoundary>
          <Suspense fallback={fallback}>
            {pg === "dashboard" && <Dashboard clients={clients} leads={leads} trials={trials} bookings={bookings} lang={lang} config={config} user={user} />}
            {pg === "clients" && <ClientsPage clients={clients} setClients={sClients} trials={trials} setTrials={sTrials} bookings={bookings} lang={lang} role={user.role} />}
            {pg === "leads" && <LeadsMetaPage leads={leads} setLeads={sLeads} trials={trials} setTrials={sTrials} lang={lang} role={user.role} />}
            {pg === "trials" && <TrialsPage trials={trials} setTrials={sTrials} clients={clients} setClients={sClients} lang={lang} role={user.role} />}
            {pg === "planning" && <PlanningPage bookings={bookings} setBookings={sBookings} clients={clients} lang={lang} trials={trials} setTrials={sTrials} />}
            {pg === "nutrition" && <NutritionPage lang={lang} />}
            {pg === "settings" && <Settings lang={lang} sLang={sLang} user={user} config={config} sConfig={sConfig} clients={clients} leads={leads} trials={trials} sClients={sClients} sLeads={sLeads} sTrials={sTrials} onLoad={() => { sClients(mkClients()); sLeads(mkLeads()); sTrials(mkTrials()) }} onReset={async () => { sClients([]); sLeads([]); sTrials([]); await sbDeleteAll("clients"); await sbDeleteAll("leads"); await sbDeleteAll("trials") }} />}
          </Suspense>
          </ErrorBoundary>
        </div></main>
      </div>
      {sbO && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", zIndex: 99 }} onClick={() => sSbO(false)} />}
      {toastEl}
    </>
  )
}
