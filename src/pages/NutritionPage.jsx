import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/i18n'
import Icon from '../components/Icon'

function buildAIPrompt(p) {
  const skip = new Set(["id", "created_at", "status", "program_generated", "user_id"])
  const data = Object.keys(p)
    .filter(k => !skip.has(k) && p[k] !== null && p[k] !== undefined && p[k] !== "")
    .map(k => `${k.replace(/_/g, " ").toUpperCase()}: ${String(p[k])}`)
    .join("\n")
  const lg = (p.language || "fr").toLowerCase()
  return `Tu es un expert en nutrition sportive diplome. Cree un programme nutritionnel personnalise de 4 semaines pour ce client, en respectant STRICTEMENT toutes ses contraintes, preferences et restrictions.

===== PROFIL CLIENT =====
CLIENT_ID: ${p.id}
${data}

===== INSTRUCTIONS DE CALCUL =====

1. BMR (Mifflin-St Jeor):
   - Homme: BMR = 10*poids + 6.25*taille - 5*age + 5
   - Femme: BMR = 10*poids + 6.25*taille - 5*age - 161

2. TDEE selon activite:
   - Sedentaire: BMR * 1.2
   - + 2x EMS/sem: BMR * 1.45
   - + 3x EMS/sem: BMR * 1.55
   - Actif: BMR * 1.65+

3. Calories cibles selon objectif:
   - Perte de poids: TDEE - 400
   - Recomposition: TDEE + 150
   - Prise de masse: TDEE + 300 a 500
   - Maintien: TDEE

4. Macros:
   - Proteines: 2g/kg (prise de masse), 2.2g/kg (perte), 1.8g/kg (maintien)
   - Lipides: 25-30% des calories
   - Glucides: le reste

===== INSTRUCTIONS DE PROGRAMME =====

Genere 4 semaines x 7 jours x 4 repas = 112 repas UNIQUES et ADAPTES:
- Respecte les intolerances/allergies/degouts A LA LETTRE
- Respecte le temps de cuisine (si 5-10 min max, AUCUNE recette longue)
- Respecte le budget (Lidl/budget serre = ingredients abordables)
- Si le client ne prend pas de petit-dej, propose un shake proteine rapide (30 sec)
- Jours EMS: pre-workout (1h avant) et shake recuperation (30 min apres)
- Dimanche: seance meal prep de 2h + 3 autres repas
- Utilise UNIQUEMENT l'equipement disponible
- Varie les recettes entre les semaines (pas de copier-coller)

LANGUE DE SORTIE: "${lg}" (fr = francais, pt = portugais, en = anglais)
Tous les noms de repas, descriptions, shopping list et conseils DOIVENT etre dans cette langue.

===== FORMAT DE SORTIE =====

Reponds UNIQUEMENT avec un JSON valide. AUCUN texte avant ou apres, AUCUN \`\`\`json\`\`\`. Format EXACT:

{
  "client_id": "${p.id}",
  "language": "${lg}",
  "client": {
    "name": "${(p.name || '').replace(/"/g, '\\"')}",
    "age": 29,
    "sex": "M",
    "weight": 86,
    "height": 188,
    "target_weight": 85,
    "body_fat": 20,
    "waist": 92,
    "goal": "Objectif principal",
    "goal_detail": "Description detaillee de l'objectif en 1 phrase",
    "activity": "Niveau d'activite + frequence EMS",
    "intolerances": "Intolerances ou 'Aucune'",
    "dislikes": "Ce qu'il n'aime pas",
    "likes": "Ce qu'il aime",
    "cuisine_pref": "Cuisine preferee",
    "cook_time": "Temps de cuisine max",
    "budget": "Budget hebdomadaire",
    "obstacle": "Principaux obstacles",
    "sleep": "Qualite et duree sommeil",
    "stress": "Niveau de stress",
    "water": "Consommation actuelle d'eau",
    "equip": "Equipement de cuisine disponible",
    "meal_prep": "Ouvert au meal prep ou non",
    "program_style": "Style de programme prefere"
  },
  "macros": {
    "bmr": 1885,
    "tdee": 2733,
    "calories": 2880,
    "protein": 172,
    "carbs": 258,
    "fat": 90
  },
  "strategy": "Strategie nutritionnelle personnalisee expliquee en 2-3 phrases",
  "adaptations": [
    ["Programme", "Tres cadre - chaque repas detaille"],
    ["Cuisine", "5-10 min max - recettes ultra-simples"],
    ["Equipement", "Airfryer + Micro-ondes + Four"],
    ["Meal prep", "Dimanche 2h pour toute la semaine"],
    ["Budget", "50-70 EUR/sem (Lidl, Continente, Pingo Doce)"],
    ["Obstacles", "Manque de temps -> meal prep, variete -> menus varies"],
    ["Points critiques", "Petit-dej manquant, hydratation insuffisante, fruits/legumes"]
  ],
  "weeks": [
    {
      "name": "SEMAINE 1 — Lancement",
      "days": [
        {
          "name": "Lundi",
          "is_ems": false,
          "is_meal_prep": false,
          "meals": [
            {"name": "Nom du repas 1", "desc": "description courte avec ingredients quantifies et methode", "kcal": 480, "macros": "P38 G48 L14"},
            {"name": "Nom du repas 2", "desc": "...", "kcal": 620, "macros": "P48 G58 L16"},
            {"name": "Collation", "desc": "...", "kcal": 260, "macros": "P14 G28 L10"},
            {"name": "Diner", "desc": "...", "kcal": 580, "macros": "P42 G52 L14"}
          ]
        }
      ]
    }
  ],
  "shopping": [
    ["PROTEINES", "Liste de proteines avec quantites precises"],
    ["LAITIERS", "Liste produits laitiers"],
    ["FECULENTS", "Liste feculents"],
    ["FRUITS & LEGUMES", "Liste fruits et legumes"],
    ["MATIERES GRASSES", "Liste matieres grasses"],
    ["EPICERIE & SAUCES", "Liste epicerie et sauces"]
  ],
  "budget_estimate": "55-65 EUR",
  "tips": [
    ["Titre court conseil 1", "Explication detaillee adaptee au profil du client"],
    ["Titre court conseil 2", "..."],
    ["Titre court conseil 3", "..."],
    ["Titre court conseil 4", "..."],
    ["Titre court conseil 5", "..."],
    ["Titre court conseil 6", "..."],
    ["Titre court conseil 7", "..."],
    ["Titre court conseil 8", "..."]
  ],
  "monthly_goals": [
    "Objectif 1 specifique au client",
    "Objectif 2",
    "Objectif 3",
    "Objectif 4",
    "Objectif 5",
    "Objectif 6"
  ]
}

RAPPELS CRITIQUES:
- JSON PUR uniquement, pas de markdown, pas de texte avant/apres
- 4 semaines COMPLETES (28 jours, 112 repas)
- Chaque repas doit etre UNIQUE et PERSONNALISE (pas de generique)
- Respecte les intolerances a 100%
- Utilise UNIQUEMENT la langue "${lg}" pour tout le contenu textuel
- Les valeurs numeriques (kcal, macros) doivent etre realistes
- La somme des 4 repas de chaque jour doit etre proche des calories cibles (+/- 100 kcal)`
}

export default function NutritionPage({ lang }) {
  const t = T[lang] || T.fr
  const [profiles, sProfiles] = useState([])
  const [feedbacks, sFeedbacks] = useState([])
  const [loaded, sLoaded] = useState(false)
  const [sel, sSel] = useState(null)
  const [urlVal, sUrlVal] = useState("")
  const [flt, sFlt] = useState("all")
  const [q, sQ] = useState("")
  const [sort, sSort] = useState("date_desc")
  const [view, sView] = useState("list")

  const [accounts, sAccounts] = useState([])
  useEffect(() => {
    async function ld() {
      const r1 = await supabase.from("nutrition_profiles").select("*").order("created_at", { ascending: false })
      if (r1.data) sProfiles(r1.data)
      const r2 = await supabase.from("weekly_feedbacks").select("*").order("created_at", { ascending: false })
      if (r2.data) sFeedbacks(r2.data)
      const r3 = await supabase.from("client_accounts").select("id,nutrition_profile_id").not("nutrition_profile_id", "is", null)
      if (r3.data) sAccounts(r3.data)
      sLoaded(true)
    }
    ld()
  }, [])

  function dago(d) { if (!d) return 0; return Math.floor((new Date() - new Date(d)) / (864e5)) }

  const nw = profiles.filter(p => p.status === "new" && !p.program_generated).length
  const dn = profiles.filter(p => p.program_generated).length
  const ip = profiles.length - nw - dn

  let list = flt === "all" ? profiles : flt === "new" ? profiles.filter(p => p.status === "new" && !p.program_generated) : flt === "done" ? profiles.filter(p => p.program_generated) : profiles.filter(p => p.status !== "new" && !p.program_generated)
  if (q.trim()) { const ql = q.toLowerCase(); list = list.filter(p => (p.name || "").toLowerCase().indexOf(ql) !== -1 || (p.email || "").toLowerCase().indexOf(ql) !== -1 || (p.phone || "").toLowerCase().indexOf(ql) !== -1) }
  list = list.slice().sort((a, b) => { if (sort === "date_desc") return new Date(b.created_at || 0) - new Date(a.created_at || 0); if (sort === "date_asc") return new Date(a.created_at || 0) - new Date(b.created_at || 0); if (sort === "name") return (a.name || "").localeCompare(b.name || ""); if (sort === "wait") return dago(b.created_at) - dago(a.created_at); return 0 })

  async function markDone(id, url) {
    await supabase.from("nutrition_profiles").update({ program_generated: true, status: "done" }).eq("id", id)
    if (url) { await supabase.from("client_accounts").update({ active_program_url: url }).eq("nutrition_profile_id", id) }
    sProfiles(prev => prev.map(p => p.id === id ? { ...p, program_generated: true, status: "done" } : p))
  }

  async function markProg(id) {
    await supabase.from("nutrition_profiles").update({ status: "in_progress" }).eq("id", id)
    sProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "in_progress" } : p))
  }

  async function deleteProfile(id) {
    if (!window.confirm("Supprimer ce profil nutrition et toutes ses donnees ?")) return
    const acct = accounts.find(a => a.nutrition_profile_id === id)
    if (acct) {
      await supabase.from("weekly_feedbacks").delete().eq("client_id", acct.id)
      await supabase.from("client_accounts").update({ nutrition_profile_id: null, onboarding_done: false, active_program_url: null }).eq("id", acct.id)
    }
    await supabase.from("weekly_feedbacks").delete().eq("client_id", id)
    await supabase.from("nutrition_profiles").delete().eq("id", id)
    sProfiles(prev => prev.filter(p => p.id !== id))
    sFeedbacks(prev => prev.filter(f => f.client_id !== id && (!acct || f.client_id !== acct.id)))
    sSel(null)
  }

  async function deleteFeedback(fbId) {
    if (!window.confirm("Supprimer ce feedback ?")) return
    await supabase.from("weekly_feedbacks").delete().eq("id", fbId)
    sFeedbacks(prev => prev.filter(f => f.id !== fbId))
  }

  if (!loaded) return <div className="fin" style={{ padding: 40, textAlign: "center", color: "var(--t2)" }}>Chargement...</div>

  if (sel) {
    const p = sel; const days = dago(p.created_at)
    const dayCol = p.program_generated ? "var(--ok)" : days > 5 ? "var(--er)" : days > 2 ? "var(--wr)" : "var(--ok)"
    const acct = accounts.find(a => a.nutrition_profile_id === p.id)
    const pfb = feedbacks.filter(f => f.client_id === p.id || (acct && f.client_id === acct.id))
    const stLabel = p.program_generated ? t.nutDone : p.status === "in_progress" ? t.nutInProgress : t.nutNew
    const stCol = p.program_generated ? "var(--ok)" : p.status === "in_progress" ? "var(--inf)" : "var(--wr)"

    return (
      <div className="fin">
        <div className="ph" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="bt bs bsm" onClick={() => sSel(null)}>&larr; Retour</button>
          <h2 style={{ flex: 1 }}>{p.name || "Sans nom"}</h2>
          {!p.program_generated && <button className="bt bp bsm" onClick={() => { const prompt = buildAIPrompt(p); navigator.clipboard.writeText(prompt); alert("Prompt IA copie !\n\n1. Colle-le dans claude.ai ou chatgpt.com\n2. Attends la reponse JSON\n3. Colle le JSON dans Claude Code\n4. Le PDF sera genere et uploade automatiquement") }}>⚡ Generer programme IA</button>}
          <button className="bt bs bsm" onClick={() => { const skip = new Set(["id","created_at","status","program_generated"]); const txt = Object.keys(p).filter(k => !skip.has(k) && p[k]).map(k => k.replace(/_/g," ").toUpperCase() + ": " + String(p[k])).join("\n"); navigator.clipboard.writeText(txt); alert("Reponses copiees !") }}>Copier reponses</button>
          <button className="bt bdd bsm" onClick={() => deleteProfile(p.id)}>Supprimer</button>
          <span style={{ fontSize: 10, fontWeight: 600, color: dayCol }}>{p.program_generated ? "\u2713 Envoy\u00e9" : days + "j d\u2019attente"}</span>
          <span style={{ background: stCol + "18", color: stCol, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, marginLeft: 6 }}>{stLabel}</span>
        </div>

        {(p.email || p.phone) && <div style={{ display: "flex", gap: 8, margin: "8px 0", fontSize: 11 }}>
          {p.email && <a href={"mailto:" + p.email} style={{ color: "var(--ac)", textDecoration: "none" }}>{p.email}</a>}
          {p.phone && <a href={"tel:" + p.phone} style={{ color: "var(--ac)", textDecoration: "none" }}>{p.phone}</a>}
        </div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, margin: "14px 0" }}>
          <div className="cd" style={{ padding: 12 }}><div className="sl">Objectif</div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.goal || "\u2014"}</div></div>
          <div className="cd" style={{ padding: 12 }}><div className="sl">Budget</div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.weekly_budget || "\u2014"}</div></div>
          <div className="cd" style={{ padding: 12 }}><div className="sl">EMS</div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.ems_frequency || "Non renseign\u00e9"}</div></div>
          <div className="cd" style={{ padding: 12 }}><div className="sl">Langue</div><div style={{ fontSize: 13, fontWeight: 600 }}>{(p.language || "fr").toUpperCase()}</div></div>
          <div className="cd" style={{ padding: 12 }}><div className="sl">Feedbacks</div><div style={{ fontSize: 13, fontWeight: 600 }}>{pfb.length}</div></div>
        </div>

        <div className="cd" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "var(--t2)" }}>URL du programme PDF</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input className="fi" style={{ flex: 1, minWidth: 200 }} placeholder="https://..." value={urlVal} onChange={e => sUrlVal(e.target.value)} />
            {!p.program_generated && <button className="bt bp bsm" onClick={() => { markDone(p.id, urlVal); sSel({ ...p, program_generated: true, status: "done" }) }}>Marquer envoy&eacute;</button>}
            {p.program_generated && urlVal && urlVal !== (accounts.find(a2 => a2.nutrition_profile_id === p.id)?.active_program_url || "") && <button className="bt bp bsm" onClick={async () => { await supabase.from("client_accounts").update({ active_program_url: urlVal }).eq("nutrition_profile_id", p.id); sSel({ ...p }) }}>Mettre a jour l'URL</button>}
            {p.status === "new" && <button className="bt bs bsm" onClick={() => { markProg(p.id); sSel({ ...p, status: "in_progress" }) }}>Passer en cours</button>}
            {p.program_generated && <button className="bt bs bsm" onClick={async () => { await supabase.from("nutrition_profiles").update({ program_generated: false, status: "in_progress" }).eq("id", p.id); sProfiles(prev => prev.map(x => x.id === p.id ? { ...x, program_generated: false, status: "in_progress" } : x)); sSel({ ...p, program_generated: false, status: "in_progress" }) }}>Rouvrir</button>}
          </div>
        </div>

        {pfb.length > 0 && <>
          {/* Weight & waist chart */}
          {(() => { const ws = pfb.filter(f => f.weight).sort((a,b) => a.week_number - b.week_number); if (ws.length < 2) return null; const weights = ws.map(f => f.weight); const minW = Math.min(...weights) - 2; const maxW = Math.max(...weights) + 2; const rng = maxW - minW || 1; return <div className="cd" style={{ padding: 14, marginBottom: 14 }}>
            <div className="cht">Progression poids</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, padding: "8px 0", borderBottom: "1px solid var(--b4)" }}>
              {ws.map((f, i) => { const pct = ((f.weight - minW) / rng) * 100; return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ fontSize: 8, fontWeight: 600, color: "var(--ac)" }}>{f.weight}</span><div style={{ width: "100%", maxWidth: 28, borderRadius: "4px 4px 0 0", background: "var(--acg)", height: Math.max(pct, 8) + "%", transition: "height .5s" }} /></div> })}
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 4 }}>{ws.map((f, i) => <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: "var(--t2)" }}>S{f.week_number}</span>)}</div>
          </div> })()}
          <div className="cd" style={{ padding: 14, marginBottom: 14 }}>
            <div className="cht">Feedbacks hebdomadaires ({pfb.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table><thead><tr>
                {["Sem", "Poids", "Taille", "\u00c9nergie", "Faim", "Adh\u00e9rence", "Sommeil", "Eau", "Humeur", "Notes", ""].map(h => <th key={h}>{h}</th>)}
              </tr></thead><tbody>
                {pfb.map(fb => <tr key={fb.id}>
                  <td>{fb.week_number || "\u2014"}</td><td>{fb.weight ? fb.weight + "kg" : "\u2014"}</td><td>{fb.waist ? fb.waist + "cm" : "\u2014"}</td>
                  <td>{fb.energy ? fb.energy + "/5" : "\u2014"}</td><td>{fb.hunger ? fb.hunger + "/5" : "\u2014"}</td><td>{fb.adherence ? fb.adherence + "%" : "\u2014"}</td>
                  <td>{fb.sleep_hours ? fb.sleep_hours + "h" : "\u2014"}</td><td>{fb.water_liters ? fb.water_liters + "L" : "\u2014"}</td>
                  <td>{fb.mood ? fb.mood + "/5" : "\u2014"}</td><td style={{ fontSize: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{fb.notes || ""}</td>
                  <td><button className="bg0" style={{ color: "var(--er)", padding: 2 }} onClick={() => deleteFeedback(fb.id)} title="Supprimer">&#10005;</button></td>
                </tr>)}
              </tbody></table>
            </div>
          </div>
        </>}

        <div className="cd" style={{ padding: 14 }}>
          <div className="cht">Toutes les r&eacute;ponses</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
            {Object.keys(p).filter(k => k !== "id" && k !== "created_at" && k !== "status" && k !== "program_generated" && p[k]).map(k =>
              <div key={k} style={{ padding: "6px 10px", background: "var(--b1)", borderRadius: 6, fontSize: 10 }}>
                <span style={{ fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", fontSize: 9 }}>{k.replace(/_/g, " ")}</span>
                <div style={{ marginTop: 2, color: "var(--t0)" }}>{String(p[k])}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const goalSt = {}; profiles.forEach(p => { const g = p.goal || "?"; goalSt[g] = (goalSt[g] || 0) + 1 })
  const budgSt = {}; profiles.forEach(p => { const b = p.weekly_budget || "?"; budgSt[b] = (budgSt[b] || 0) + 1 })

  return (
    <div className="fin">
      <div className="ph" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}><h2>Nutrition</h2><p>{profiles.length} profils</p></div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={"bt " + (view === "list" ? "bp" : "bs") + " bsm"} onClick={() => sView("list")}>Liste</button>
          <button className={"bt " + (view === "stats" ? "bp" : "bs") + " bsm"} onClick={() => sView("stats")}>Statistiques</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--wr)", cursor: "pointer", textDecoration: flt === "new" ? "underline" : "none" }} onClick={() => sFlt(flt === "new" ? "all" : "new")}>{nw} Nouveaux</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--inf)", cursor: "pointer", textDecoration: flt === "prog" ? "underline" : "none" }} onClick={() => sFlt(flt === "prog" ? "all" : "prog")}>{ip} En cours</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ok)", cursor: "pointer", textDecoration: flt === "done" ? "underline" : "none" }} onClick={() => sFlt(flt === "done" ? "all" : "done")}>{dn} Envoy&eacute;s</span>
      </div>

      {view === "stats" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, marginBottom: 20 }}>
        <div className="cd">
          <div className="cht">R&eacute;partition objectifs</div>
          {Object.keys(goalSt).map(g => { const pct = profiles.length ? Math.round(goalSt[g] / profiles.length * 100) : 0; return <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}><div style={{ flex: 1, fontSize: 12 }}>{g}</div><span style={{ fontSize: 11, fontWeight: 600 }}>{goalSt[g]}</span><div style={{ width: 60, height: 5, background: "var(--b1)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: pct + "%", background: "var(--ac)", borderRadius: 3 }} /></div><span style={{ fontSize: 9, color: "var(--t2)", width: 30, textAlign: "right" }}>{pct}%</span></div> })}
        </div>
        <div className="cd">
          <div className="cht">R&eacute;partition budgets</div>
          {Object.keys(budgSt).map(b => { const pct = profiles.length ? Math.round(budgSt[b] / profiles.length * 100) : 0; return <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}><div style={{ flex: 1, fontSize: 12 }}>{b}</div><span style={{ fontSize: 11, fontWeight: 600 }}>{budgSt[b]}</span><div style={{ width: 60, height: 5, background: "var(--b1)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: pct + "%", background: "var(--wr)", borderRadius: 3 }} /></div><span style={{ fontSize: 9, color: "var(--t2)", width: 30, textAlign: "right" }}>{pct}%</span></div> })}
        </div>
        <div className="cd">
          <div className="cht">R&eacute;sum&eacute;</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}><div style={{ flex: 1, fontSize: 12 }}>Feedbacks re&ccedil;us</div><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ac)" }}>{feedbacks.length}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}><div style={{ flex: 1, fontSize: 12 }}>Attente &gt; 3 jours</div><span style={{ fontSize: 13, fontWeight: 700, color: "var(--er)" }}>{profiles.filter(p => !p.program_generated && dago(p.created_at) > 3).length}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}><div style={{ flex: 1, fontSize: 12 }}>Taux d&apos;envoi</div><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ok)" }}>{profiles.length ? Math.round(dn / profiles.length * 100) + "%" : "0%"}</span></div>
        </div>
      </div>}

      {view === "list" && <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input className="fi" style={{ flex: 1 }} placeholder="Rechercher..." value={q} onChange={e => sQ(e.target.value)} />
          <select className="fi" style={{ width: 140 }} value={sort} onChange={e => sSort(e.target.value)}>
            <option value="date_desc">Plus r&eacute;cents</option><option value="date_asc">Plus anciens</option><option value="name">Nom A-Z</option><option value="wait">Attente</option>
          </select>
          <select className="fi" style={{ width: 120 }} value={flt} onChange={e => sFlt(e.target.value)}>
            <option value="all">Tous</option><option value="new">Nouveaux</option><option value="prog">En cours</option><option value="done">Envoy&eacute;s</option>
          </select>
        </div>

        {list.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--t2)" }}><div style={{ fontSize: 13, fontWeight: 600 }}>{q ? "Aucun r\u00e9sultat" : "Aucun profil"}</div></div> :
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr>
              <th>NOM</th><th>T&Eacute;L&Eacute;PHONE</th><th>OBJECTIF</th>
              <th>EMS</th><th>BUDGET</th><th>ATTENTE</th><th>STATUT</th><th></th>
            </tr></thead><tbody>
              {list.map(p => {
                const days = dago(p.created_at); const st2 = p.program_generated ? "done" : p.status === "in_progress" ? "prog" : "new"
                const stC = { new: "#C47F17", prog: "#2E6DA4", done: "#2D8C5A" }; const stL = { new: t.nutNew, prog: t.nutInProgress, done: t.nutDone }
                const dayCol = p.program_generated ? "#2D8C5A" : days > 5 ? "#C43333" : days > 2 ? "#C47F17" : "#2D8C5A"
                const acctL = accounts.find(a => a.nutrition_profile_id === p.id)
                const fbC = feedbacks.filter(f => f.client_id === p.id || (acctL && f.client_id === acctL.id)).length
                return <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => { sSel(p); sUrlVal("") }}>
                  <td><strong>{p.name || "\u2014"}</strong>{p.email ? <div style={{ fontSize: 9, color: "var(--t2)" }}>{p.email}</div> : null}</td>
                  <td style={{ fontSize: 11 }}>{p.phone ? <a href={"tel:" + p.phone} onClick={e => e.stopPropagation()} style={{ color: "var(--ac)", textDecoration: "none" }}>{p.phone}</a> : "\u2014"}</td>
                  <td style={{ fontSize: 11 }}>{p.goal || "\u2014"}</td>
                  <td style={{ fontSize: 11 }}>{p.ems_frequency || "\u2014"}</td>
                  <td style={{ fontSize: 11 }}>{p.weekly_budget || "\u2014"}</td>
                  <td><span style={{ fontWeight: 600, fontSize: 10, color: dayCol }}>{p.program_generated ? "\u2713" : days + "j"}</span></td>
                  <td><span style={{ background: stC[st2] + "18", color: stC[st2], padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{stL[st2]}</span>{fbC > 0 ? <span style={{ marginLeft: 4, fontSize: 9, color: "var(--t2)" }}>{fbC}</span> : null}</td>
                  <td><button className="bt bs bsm" onClick={e => { e.stopPropagation(); sSel(p); sUrlVal("") }}>Voir</button></td>
                </tr>
              })}
            </tbody></table>
          </div>}
      </div>}
    </div>
  )
}
