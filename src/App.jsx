import { useState, useEffect, useRef } from 'react'
import { supabase, sbLoadAll, sbUpsert, sbDelete, sbDeleteAll, dbToClient, clientToDb, dbToLead, leadToDb, dbToTrial, trialToDb } from './lib/supabase'
import { T } from './lib/i18n'
import { SUB, SOURCES } from './lib/constants'
import { mkClients, mkLeads, mkTrials } from './lib/sampleData'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Icon from './components/Icon'
import Dashboard from './pages/Dashboard'
import ClientsPage from './pages/ClientsPage'
import LeadsMetaPage from './pages/LeadsMetaPage'
import TrialsPage from './pages/TrialsPage'
import NutritionPage from './pages/NutritionPage'
import Settings from './pages/Settings'

export default function App() {
  const [user, sUser] = useState(null)
  const [lang, sLang] = useState("fr")
  const [pg, sPg] = useState("dashboard")
  const [clients, sClients] = useState([])
  const [leads, sLeads] = useState([])
  const [trials, sTrials] = useState([])
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
        const cfgRes = await supabase.from("config").select("data").eq("id", "main").single()
        if (cfgRes.data && cfgRes.data.data) sConfig(cfgRes.data.data)
      } catch (e) {
        console.error("Load error", e)
        sClients(mkClients()); sLeads(mkLeads()); sTrials(mkTrials())
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
      for (let i = 0; i < clients.length; i++) { await sbUpsert("clients", clientToDb(clients[i])) }
    })
  }, [clients, init])

  useEffect(() => {
    if (!init) return
    debouncedSync("leads", async () => {
      const existing = await sbLoadAll("leads", dbToLead)
      const currentIds = new Set(leads.map(l => l.id))
      existing.forEach(e => { if (!currentIds.has(e.id)) sbDelete("leads", e.id) })
      for (let i = 0; i < leads.length; i++) { await sbUpsert("leads", leadToDb(leads[i])) }
    })
  }, [leads, init])

  useEffect(() => {
    if (!init) return
    debouncedSync("trials", async () => {
      const existing = await sbLoadAll("trials", dbToTrial)
      const currentIds = new Set(trials.map(t2 => t2.id))
      existing.forEach(e => { if (!currentIds.has(e.id)) sbDelete("trials", e.id) })
      for (let i = 0; i < trials.length; i++) { await sbUpsert("trials", trialToDb(trials[i])) }
    })
  }, [trials, init])

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
          {pg === "dashboard" && <Dashboard clients={clients} leads={leads} trials={trials} lang={lang} config={config} />}
          {pg === "clients" && <ClientsPage clients={clients} setClients={sClients} trials={trials} setTrials={sTrials} lang={lang} role={user.role} />}
          {pg === "leads" && <LeadsMetaPage leads={leads} setLeads={sLeads} trials={trials} setTrials={sTrials} lang={lang} role={user.role} />}
          {pg === "trials" && <TrialsPage trials={trials} setTrials={sTrials} clients={clients} setClients={sClients} lang={lang} role={user.role} />}
          {pg === "nutrition" && <NutritionPage lang={lang} />}
          {pg === "settings" && <Settings lang={lang} sLang={sLang} user={user} config={config} sConfig={sConfig} clients={clients} leads={leads} trials={trials} sClients={sClients} sLeads={sLeads} sTrials={sTrials} onLoad={() => { sClients(mkClients()); sLeads(mkLeads()); sTrials(mkTrials()) }} onReset={async () => { sClients([]); sLeads([]); sTrials([]); await sbDeleteAll("clients"); await sbDeleteAll("leads"); await sbDeleteAll("trials") }} />}
        </div></main>
      </div>
      {sbO && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", zIndex: 99 }} onClick={() => sSbO(false)} />}
    </>
  )
}
