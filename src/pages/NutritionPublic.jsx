import { useState } from 'react'
import { supabase } from '../lib/supabase'

const STEPS = ['info', 'body', 'goal', 'diet', 'habits', 'medical', 'confirm']

const TXT = {
  pt: {
    title: 'Questionário Nutricional',
    sub: 'BodyFit Campo de Ourique',
    next: 'Seguinte', prev: 'Anterior', submit: 'Enviar', sending: 'A enviar...',
    step: 'Passo',
    of: 'de',
    required: 'Obrigatório',
    // Step 1: info
    infoTitle: 'Dados pessoais',
    name: 'Nome completo', email: 'Email', phone: 'Telefone', age: 'Idade', gender: 'Género',
    male: 'Masculino', female: 'Feminino', other: 'Outro',
    lang: 'Idioma preferido', langPt: 'Português', langFr: 'Français', langEn: 'English',
    // Step 2: body
    bodyTitle: 'Medidas atuais',
    height: 'Altura (cm)', weight: 'Peso atual (kg)',
    // Step 3: goal
    goalTitle: 'Objetivos',
    goal: 'Objetivo principal',
    goalOpts: ['Perda de peso', 'Ganho muscular', 'Tonificação', 'Saúde geral', 'Performance', 'Outro'],
    goalDetail: 'Detalhes sobre o seu objetivo',
    activityLevel: 'Nível de atividade física',
    activityOpts: ['Sedentário', 'Ligeiramente ativo', 'Moderadamente ativo', 'Muito ativo'],
    emsFrequency: 'Frequência EMS por semana',
    emsOpts: ['1x', '2x', '3x', '4x+'],
    motivation: 'O que o/a motiva a começar agora?',
    // Step 4: diet
    dietTitle: 'Alimentação',
    dietType: 'Tipo de alimentação',
    dietOpts: ['Omnívoro', 'Vegetariano', 'Vegano', 'Pescetariano', 'Sem restrições', 'Outro'],
    allergies: 'Alergias alimentares',
    allergiesPlaceholder: 'Ex: amendoins, marisco, lactose...',
    intolerances: 'Intolerâncias',
    intolerancesPlaceholder: 'Ex: glúten, lactose...',
    mealsPerDay: 'Refeições por dia',
    mealsOpts: ['2', '3', '4', '5', '6+'],
    cookingTime: 'Tempo disponível para cozinhar',
    cookingOpts: ['< 15 min', '15-30 min', '30-60 min', '> 1 hora'],
    weeklyBudget: 'Orçamento semanal alimentação',
    budgetOpts: ['< 30€', '30-50€', '50-80€', '80-120€', '> 120€'],
    // Step 5: habits
    habitsTitle: 'Hábitos',
    breakfastHabit: 'Toma pequeno-almoço?',
    yes: 'Sim', no: 'Não', sometimes: 'Às vezes',
    snackHabit: 'Come snacks entre refeições?',
    alcohol: 'Consumo de álcool',
    alcoholOpts: ['Nunca', 'Ocasional', '1-2x/semana', 'Diário'],
    coffee: 'Cafés por dia',
    coffeeOpts: ['0', '1-2', '3-4', '5+'],
    waterIntake: 'Água por dia (litros)',
    waterOpts: ['< 1L', '1-1.5L', '1.5-2L', '2-3L', '> 3L'],
    sleepHours: 'Horas de sono por noite',
    sleepOpts: ['< 5h', '5-6h', '6-7h', '7-8h', '> 8h'],
    stressLevel: 'Nível de stress',
    stressOpts: ['Baixo', 'Moderado', 'Alto', 'Muito alto'],
    supplements: 'Suplementos que toma',
    supplementsPlaceholder: 'Ex: proteína, creatina, multivitamínico...',
    // Step 6: medical
    medicalTitle: 'Saúde',
    medicalConditions: 'Condições médicas relevantes',
    medicalPlaceholder: 'Ex: diabetes, hipertensão, tireoide...',
    medications: 'Medicamentos que toma',
    medicationsPlaceholder: 'Lista de medicamentos atuais',
    digestiveIssues: 'Problemas digestivos',
    digestivePlaceholder: 'Ex: refluxo, inchaço, obstipação...',
    extraNotes: 'Notas adicionais',
    extraPlaceholder: 'Algo mais que devemos saber?',
    // Confirm
    confirmTitle: 'Confirmar envio',
    confirmText: 'Verifique os seus dados antes de enviar.',
    successTitle: 'Questionário enviado!',
    successText: 'Obrigado! Vamos analisar as suas respostas e preparar o seu programa nutricional personalizado. Será contactado(a) em breve.',
    errorGeneric: 'Erro ao enviar. Tente novamente.',
  },
  fr: {
    title: 'Questionnaire Nutritionnel',
    sub: 'BodyFit Campo de Ourique',
    next: 'Suivant', prev: 'Précédent', submit: 'Envoyer', sending: 'Envoi...',
    step: 'Étape',
    of: 'de',
    required: 'Obligatoire',
    infoTitle: 'Informations personnelles',
    name: 'Nom complet', email: 'Email', phone: 'Téléphone', age: 'Âge', gender: 'Genre',
    male: 'Homme', female: 'Femme', other: 'Autre',
    lang: 'Langue préférée', langPt: 'Português', langFr: 'Français', langEn: 'English',
    bodyTitle: 'Mensurations actuelles',
    height: 'Taille (cm)', weight: 'Poids actuel (kg)',
    goalTitle: 'Objectifs',
    goal: 'Objectif principal',
    goalOpts: ['Perte de poids', 'Gain musculaire', 'Tonification', 'Santé générale', 'Performance', 'Autre'],
    goalDetail: 'Détails sur votre objectif',
    activityLevel: "Niveau d'activité physique",
    activityOpts: ['Sédentaire', 'Légèrement actif', 'Modérément actif', 'Très actif'],
    emsFrequency: 'Fréquence EMS par semaine',
    emsOpts: ['1x', '2x', '3x', '4x+'],
    motivation: 'Qu\'est-ce qui vous motive à commencer maintenant ?',
    dietTitle: 'Alimentation',
    dietType: "Type d'alimentation",
    dietOpts: ['Omnivore', 'Végétarien', 'Végan', 'Pescétarien', 'Sans restriction', 'Autre'],
    allergies: 'Allergies alimentaires',
    allergiesPlaceholder: 'Ex : arachides, fruits de mer, lactose...',
    intolerances: 'Intolérances',
    intolerancesPlaceholder: 'Ex : gluten, lactose...',
    mealsPerDay: 'Repas par jour',
    mealsOpts: ['2', '3', '4', '5', '6+'],
    cookingTime: 'Temps disponible pour cuisiner',
    cookingOpts: ['< 15 min', '15-30 min', '30-60 min', '> 1 heure'],
    weeklyBudget: 'Budget alimentaire hebdomadaire',
    budgetOpts: ['< 30€', '30-50€', '50-80€', '80-120€', '> 120€'],
    habitsTitle: 'Habitudes',
    breakfastHabit: 'Prenez-vous le petit-déjeuner ?',
    yes: 'Oui', no: 'Non', sometimes: 'Parfois',
    snackHabit: 'Grignotez-vous entre les repas ?',
    alcohol: "Consommation d'alcool",
    alcoholOpts: ['Jamais', 'Occasionnel', '1-2x/semaine', 'Quotidien'],
    coffee: 'Cafés par jour',
    coffeeOpts: ['0', '1-2', '3-4', '5+'],
    waterIntake: "Eau par jour (litres)",
    waterOpts: ['< 1L', '1-1.5L', '1.5-2L', '2-3L', '> 3L'],
    sleepHours: 'Heures de sommeil par nuit',
    sleepOpts: ['< 5h', '5-6h', '6-7h', '7-8h', '> 8h'],
    stressLevel: 'Niveau de stress',
    stressOpts: ['Bas', 'Modéré', 'Élevé', 'Très élevé'],
    supplements: 'Suppléments que vous prenez',
    supplementsPlaceholder: 'Ex : protéine, créatine, multivitamines...',
    medicalTitle: 'Santé',
    medicalConditions: 'Conditions médicales',
    medicalPlaceholder: 'Ex : diabète, hypertension, thyroïde...',
    medications: 'Médicaments actuels',
    medicationsPlaceholder: 'Liste de vos médicaments',
    digestiveIssues: 'Problèmes digestifs',
    digestivePlaceholder: 'Ex : reflux, ballonnements, constipation...',
    extraNotes: 'Notes supplémentaires',
    extraPlaceholder: "Autre chose qu'on devrait savoir ?",
    confirmTitle: "Confirmer l'envoi",
    confirmText: 'Vérifiez vos données avant d\'envoyer.',
    successTitle: 'Questionnaire envoyé !',
    successText: 'Merci ! Nous allons analyser vos réponses et préparer votre programme nutritionnel personnalisé. Vous serez contacté(e) prochainement.',
    errorGeneric: "Erreur lors de l'envoi. Réessayez.",
  },
  en: {
    title: 'Nutrition Questionnaire',
    sub: 'BodyFit Campo de Ourique',
    next: 'Next', prev: 'Back', submit: 'Submit', sending: 'Sending...',
    step: 'Step',
    of: 'of',
    required: 'Required',
    infoTitle: 'Personal Information',
    name: 'Full name', email: 'Email', phone: 'Phone', age: 'Age', gender: 'Gender',
    male: 'Male', female: 'Female', other: 'Other',
    lang: 'Preferred language', langPt: 'Português', langFr: 'Français', langEn: 'English',
    bodyTitle: 'Current Measurements',
    height: 'Height (cm)', weight: 'Current weight (kg)',
    goalTitle: 'Goals',
    goal: 'Main goal',
    goalOpts: ['Weight loss', 'Muscle gain', 'Toning', 'General health', 'Performance', 'Other'],
    goalDetail: 'Details about your goal',
    activityLevel: 'Physical activity level',
    activityOpts: ['Sedentary', 'Slightly active', 'Moderately active', 'Very active'],
    emsFrequency: 'EMS frequency per week',
    emsOpts: ['1x', '2x', '3x', '4x+'],
    motivation: 'What motivates you to start now?',
    dietTitle: 'Diet',
    dietType: 'Diet type',
    dietOpts: ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'No restrictions', 'Other'],
    allergies: 'Food allergies',
    allergiesPlaceholder: 'E.g.: peanuts, shellfish, lactose...',
    intolerances: 'Intolerances',
    intolerancesPlaceholder: 'E.g.: gluten, lactose...',
    mealsPerDay: 'Meals per day',
    mealsOpts: ['2', '3', '4', '5', '6+'],
    cookingTime: 'Available cooking time',
    cookingOpts: ['< 15 min', '15-30 min', '30-60 min', '> 1 hour'],
    weeklyBudget: 'Weekly food budget',
    budgetOpts: ['< 30€', '30-50€', '50-80€', '80-120€', '> 120€'],
    habitsTitle: 'Habits',
    breakfastHabit: 'Do you eat breakfast?',
    yes: 'Yes', no: 'No', sometimes: 'Sometimes',
    snackHabit: 'Do you snack between meals?',
    alcohol: 'Alcohol consumption',
    alcoholOpts: ['Never', 'Occasional', '1-2x/week', 'Daily'],
    coffee: 'Coffees per day',
    coffeeOpts: ['0', '1-2', '3-4', '5+'],
    waterIntake: 'Water per day (liters)',
    waterOpts: ['< 1L', '1-1.5L', '1.5-2L', '2-3L', '> 3L'],
    sleepHours: 'Hours of sleep per night',
    sleepOpts: ['< 5h', '5-6h', '6-7h', '7-8h', '> 8h'],
    stressLevel: 'Stress level',
    stressOpts: ['Low', 'Moderate', 'High', 'Very high'],
    supplements: 'Supplements you take',
    supplementsPlaceholder: 'E.g.: protein, creatine, multivitamin...',
    medicalTitle: 'Health',
    medicalConditions: 'Medical conditions',
    medicalPlaceholder: 'E.g.: diabetes, hypertension, thyroid...',
    medications: 'Current medications',
    medicationsPlaceholder: 'List your current medications',
    digestiveIssues: 'Digestive issues',
    digestivePlaceholder: 'E.g.: reflux, bloating, constipation...',
    extraNotes: 'Additional notes',
    extraPlaceholder: 'Anything else we should know?',
    confirmTitle: 'Confirm submission',
    confirmText: 'Review your data before submitting.',
    successTitle: 'Questionnaire submitted!',
    successText: 'Thank you! We will analyze your responses and prepare your personalized nutrition program. You will be contacted shortly.',
    errorGeneric: 'Error submitting. Please try again.',
  }
}

function Chips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s', fontFamily: "'DM Sans',sans-serif",
            borderColor: value === o ? 'var(--ac)' : 'var(--bd)',
            background: value === o ? 'var(--ac)' : 'var(--b2)',
            color: value === o ? '#fff' : 'var(--t0)'
          }}>{o}</button>
      ))}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.3px' }}>
        {label}{required && <span style={{ color: 'var(--er)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function NutritionPublic() {
  const [lang, setLang] = useState('pt')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', age: '', gender: '', language: 'pt',
    height: '', weight: '',
    goal: '', goal_detail: '', activity_level: '', ems_frequency: '', motivation: '',
    diet_type: '', allergies: '', intolerances: '', meals_per_day: '', cooking_time: '', weekly_budget: '',
    breakfast_habit: '', snack_habit: '', alcohol: '', coffee: '', water_intake: '', sleep_hours: '', stress_level: '', supplements: '',
    medical_conditions: '', medications: '', digestive_issues: '', extra_notes: ''
  })

  const t = TXT[lang]
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function canNext() {
    if (step === 0) return form.name.trim().length >= 2 && form.phone.trim().length >= 6
    if (step === 2) return !!form.goal
    return true
  }

  function goNext() { if (canNext()) { setError(''); setStep(s => s + 1) } }
  function goPrev() { setError(''); setStep(s => s - 1) }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const row = { ...form, language: lang, status: 'new', program_generated: false }
      const { error: err } = await supabase.from('nutrition_profiles').insert(row)
      if (err) { setError(t.errorGeneric); console.error(err) }
      else setDone(true)
    } catch { setError(t.errorGeneric) }
    finally { setLoading(false) }
  }

  if (done) return (
    <div className="bk-page"><div className="bk-card bk-in" style={{ textAlign: 'center' }}>
      <div className="bk-logo">BODY<em>FIT</em></div>
      <div className="bk-sub">{t.sub}</div>
      <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t.successTitle}</h2>
      <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6 }}>{t.successText}</p>
    </div></div>
  )

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="bk-page">
      <div className="bk-card bk-in" style={{ maxWidth: 500 }}>
        <div className="bk-logo">BODY<em>FIT</em></div>
        <div className="bk-sub">{t.sub}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 16 }}>
          {['pt', 'fr', 'en'].map(x => (
            <button key={x} onClick={() => { setLang(x); up('language', x) }}
              style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid', fontSize: 9, fontWeight: 600, cursor: 'pointer',
                borderColor: lang === x ? 'var(--ac)' : 'var(--bd)',
                background: lang === x ? 'var(--ac)' : 'none',
                color: lang === x ? '#fff' : 'var(--t1)'
              }}>{x.toUpperCase()}</button>
          ))}
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>{t.title}</h2>

        {/* Progress bar */}
        <div style={{ margin: '12px 0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t2)', marginBottom: 4 }}>
            <span>{t.step} {step + 1} {t.of} {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: progress + '%', background: 'var(--ac)', borderRadius: 2, transition: 'width .3s' }} />
          </div>
        </div>

        {error && <div style={{ background: 'var(--erg)', color: 'var(--er)', padding: 8, borderRadius: 6, fontSize: 11, marginBottom: 12 }}>{error}</div>}

        {/* Step 0: Personal info */}
        {step === 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.infoTitle}</div>
          <Field label={t.name} required><input className="fi" value={form.name} onChange={e => up('name', e.target.value)} /></Field>
          <Field label={t.email}><input className="fi" type="email" value={form.email} onChange={e => up('email', e.target.value)} /></Field>
          <Field label={t.phone} required><input className="fi" type="tel" value={form.phone} onChange={e => up('phone', e.target.value)} placeholder="+351 ..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t.age}><input className="fi" type="number" min="10" max="99" value={form.age} onChange={e => up('age', e.target.value)} /></Field>
            <Field label={t.gender}><Chips options={[t.female, t.male, t.other]} value={form.gender} onChange={v => up('gender', v)} /></Field>
          </div>
          <Field label={t.lang}>
            <Chips options={[t.langPt, t.langFr, t.langEn]} value={{ pt: t.langPt, fr: t.langFr, en: t.langEn }[lang]} onChange={v => {
              const code = v === t.langPt ? 'pt' : v === t.langFr ? 'fr' : 'en'
              setLang(code); up('language', code)
            }} />
          </Field>
        </div>}

        {/* Step 1: Body */}
        {step === 1 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.bodyTitle}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t.height}><input className="fi" type="number" min="100" max="250" value={form.height} onChange={e => up('height', e.target.value)} /></Field>
            <Field label={t.weight}><input className="fi" type="number" min="30" max="300" step="0.1" value={form.weight} onChange={e => up('weight', e.target.value)} /></Field>
          </div>
        </div>}

        {/* Step 2: Goals */}
        {step === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.goalTitle}</div>
          <Field label={t.goal} required><Chips options={t.goalOpts} value={form.goal} onChange={v => up('goal', v)} /></Field>
          <Field label={t.goalDetail}><textarea className="fta" value={form.goal_detail} onChange={e => up('goal_detail', e.target.value)} /></Field>
          <Field label={t.activityLevel}><Chips options={t.activityOpts} value={form.activity_level} onChange={v => up('activity_level', v)} /></Field>
          <Field label={t.emsFrequency}><Chips options={t.emsOpts} value={form.ems_frequency} onChange={v => up('ems_frequency', v)} /></Field>
          <Field label={t.motivation}><textarea className="fta" value={form.motivation} onChange={e => up('motivation', e.target.value)} /></Field>
        </div>}

        {/* Step 3: Diet */}
        {step === 3 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.dietTitle}</div>
          <Field label={t.dietType}><Chips options={t.dietOpts} value={form.diet_type} onChange={v => up('diet_type', v)} /></Field>
          <Field label={t.allergies}><input className="fi" value={form.allergies} onChange={e => up('allergies', e.target.value)} placeholder={t.allergiesPlaceholder} /></Field>
          <Field label={t.intolerances}><input className="fi" value={form.intolerances} onChange={e => up('intolerances', e.target.value)} placeholder={t.intolerancesPlaceholder} /></Field>
          <Field label={t.mealsPerDay}><Chips options={t.mealsOpts} value={form.meals_per_day} onChange={v => up('meals_per_day', v)} /></Field>
          <Field label={t.cookingTime}><Chips options={t.cookingOpts} value={form.cooking_time} onChange={v => up('cooking_time', v)} /></Field>
          <Field label={t.weeklyBudget}><Chips options={t.budgetOpts} value={form.weekly_budget} onChange={v => up('weekly_budget', v)} /></Field>
        </div>}

        {/* Step 4: Habits */}
        {step === 4 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.habitsTitle}</div>
          <Field label={t.breakfastHabit}><Chips options={[t.yes, t.no, t.sometimes]} value={form.breakfast_habit} onChange={v => up('breakfast_habit', v)} /></Field>
          <Field label={t.snackHabit}><Chips options={[t.yes, t.no, t.sometimes]} value={form.snack_habit} onChange={v => up('snack_habit', v)} /></Field>
          <Field label={t.alcohol}><Chips options={t.alcoholOpts} value={form.alcohol} onChange={v => up('alcohol', v)} /></Field>
          <Field label={t.coffee}><Chips options={t.coffeeOpts} value={form.coffee} onChange={v => up('coffee', v)} /></Field>
          <Field label={t.waterIntake}><Chips options={t.waterOpts} value={form.water_intake} onChange={v => up('water_intake', v)} /></Field>
          <Field label={t.sleepHours}><Chips options={t.sleepOpts} value={form.sleep_hours} onChange={v => up('sleep_hours', v)} /></Field>
          <Field label={t.stressLevel}><Chips options={t.stressOpts} value={form.stress_level} onChange={v => up('stress_level', v)} /></Field>
          <Field label={t.supplements}><input className="fi" value={form.supplements} onChange={e => up('supplements', e.target.value)} placeholder={t.supplementsPlaceholder} /></Field>
        </div>}

        {/* Step 5: Medical */}
        {step === 5 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.medicalTitle}</div>
          <Field label={t.medicalConditions}><textarea className="fta" value={form.medical_conditions} onChange={e => up('medical_conditions', e.target.value)} placeholder={t.medicalPlaceholder} /></Field>
          <Field label={t.medications}><textarea className="fta" value={form.medications} onChange={e => up('medications', e.target.value)} placeholder={t.medicationsPlaceholder} /></Field>
          <Field label={t.digestiveIssues}><textarea className="fta" value={form.digestive_issues} onChange={e => up('digestive_issues', e.target.value)} placeholder={t.digestivePlaceholder} /></Field>
          <Field label={t.extraNotes}><textarea className="fta" value={form.extra_notes} onChange={e => up('extra_notes', e.target.value)} placeholder={t.extraPlaceholder} /></Field>
        </div>}

        {/* Step 6: Confirm */}
        {step === 6 && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{t.confirmTitle}</div>
          <p style={{ fontSize: 11, color: 'var(--t1)' }}>{t.confirmText}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.entries(form).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ padding: '6px 10px', background: 'var(--b1)', borderRadius: 6, fontSize: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', fontSize: 9 }}>{k.replace(/_/g, ' ')}</span>
                <div style={{ marginTop: 2, color: 'var(--t0)', wordBreak: 'break-word' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 8 }}>
          {step > 0 ? <button type="button" onClick={goPrev} className="bt bs" style={{ flex: 1, justifyContent: 'center' }}>{t.prev}</button> : <div />}
          {step < STEPS.length - 1
            ? <button type="button" onClick={goNext} className="bt bp" disabled={!canNext()} style={{ flex: 1, justifyContent: 'center', opacity: canNext() ? 1 : 0.5 }}>{t.next}</button>
            : <button type="button" onClick={handleSubmit} className="bt bp" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>{loading ? t.sending : t.submit}</button>
          }
        </div>
      </div>
    </div>
  )
}
