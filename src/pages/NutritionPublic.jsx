import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════
// i18n — FR / PT / EN (condensed, matches original app)
// ═══════════════════════════════════════════════════════
const L = {
fr:{
  login:"Connexion",signup:"Créer un compte",email:"Email",password:"Mot de passe",name:"Prénom & Nom",
  loginBtn:"Se connecter",signupBtn:"Créer mon compte",noAccount:"Pas encore de compte ?",hasAccount:"Déjà un compte ?",
  signupLink:"Créer un compte",loginLink:"Se connecter",
  logout:"Déconnexion",dashboard:"Tableau de bord",questionnaire:"Questionnaire",program:"Mon programme",feedback:"Feedback",progress:"Progression",
  welcome:"Bienvenue",welcomeDesc:"Votre espace nutrition personnalisé",
  startOnb:"Commencer le questionnaire",completeOnb:"Complétez votre profil nutritionnel pour recevoir votre programme personnalisé.",
  myProgram:"Mon Programme",noProgram:"Votre programme est en cours de création",noProgramDesc:"Une fois le questionnaire complété, notre équipe créera votre programme sous 48h.",
  downloadPdf:"Télécharger le PDF",
  weeklyFb:"Feedback hebdomadaire",fbDesc:"Remplissez chaque semaine pour ajuster votre prochain programme",
  weight:"Poids (kg)",waistFb:"Tour de taille (cm)",energy:"Énergie (1-5)",hunger:"Faim (1-5)",adherence:"Adhérence (%)",sleep:"Sommeil (h)",water:"Eau (L/j)",mood:"Humeur (1-5)",notes:"Notes / Ressentis",cycleFb:"Phase du cycle",
  sendFb:"Envoyer le feedback",fbSent:"Feedback enregistré !",
  progressTitle:"Ma progression",noData:"Pas encore de données",weightChart:"Évolution du poids",
  currentWeight:"Poids actuel",targetWeight:"Objectif",remaining:"Restant",weekN:"Sem",
  next:"Continuer",back:"Retour",submit:"Envoyer",confirmEmail:"Vérifiez votre email pour confirmer votre compte.",
  onb_p1:"Vos données",onb_p1d:"Pour calculer vos besoins",onb_p2:"Votre objectif",onb_p2d:"Quel résultat visez-vous ?",
  onb_p3:"Activité physique",onb_p3d:"Votre entraînement",onb_p4:"Santé",onb_p4d:"Sécurité du programme",
  onb_p5:"Mode de vie",onb_p5d:"Sommeil, stress, rythme",onb_p6:"Habitudes",onb_p6d:"Comment vous mangez aujourd'hui",
  onb_p7:"Préférences",onb_p7d:"Goûts et cuisine",onb_p8:"Budget",onb_p8d:"Pour adapter les ingrédients",
  onb_p9:"Supplémentation",onb_p9d:"Optionnel — votre choix",onb_p10:"Motivation",onb_p10d:"Pour personnaliser l'approche",
  sex:"Sexe",male:"Homme",female:"Femme",age:"Âge",height:"Taille (cm)",waist:"Tour de taille (cm)",bodyFat:"Masse grasse (%)",targetW:"Poids objectif (kg)",
  timeline:"Délai",tl1:"1-2 mois",tl2:"3-4 mois",tl3:"6 mois",tl4:"1 an",tl5:"Pas de délai",
  goal:"Objectif principal",g1:"Perte de poids",g2:"Prise de masse",g3:"Rééquilibrage",g4:"Performance",g5:"Santé & Bien-être",g6:"Maintien",
  goalDetail:"Décrivez en une phrase",goalPh:"ex: Me sentir bien dans mon corps / Perdre le ventre",
  emsFreq:"Séances EMS / semaine",emsTime:"Moment de votre séance EMS",emsMorning:"Matin",emsNoon:"Midi",emsAfternoon:"Après-midi",emsEvening:"Soir",
  otherAct:"Autres activités",noOther:"Uniquement EMS",walk:"Marche",run:"Course",gym:"Musculation",swim:"Natation",yoga:"Yoga/Pilates",bike:"Vélo",other:"Autre",
  otherIntensity:"Intensité des autres activités",intLight:"Légère",intMod:"Modérée",intHigh:"Intense",
  dailyAct:"Quotidien hors sport",sed:"Sédentaire (bureau)",light:"Légèrement actif",actif:"Actif (souvent debout)",vActif:"Très actif (travail physique)",
  pathologies:"Pathologies",pathNone:"Aucune",diab:"Diabète",chol:"Cholestérol",hyp:"Hypertension",thyr:"Thyroïde",sopk:"SOPK",dig:"Troubles digestifs",pathOther:"Autre",
  pregnant:"Enceinte ou allaitante ?",pregNo:"Non",pregYes:"Oui",pregNA:"Ne s'applique pas",
  meds:"Médicaments",allergies:"Allergies alimentaires",algNone:"Aucune",nuts:"Fruits à coque",sea:"Fruits de mer",egg:"Œufs",soy:"Soja",algOther:"Autre",
  intol:"Intolérances",intNone:"Aucune",lactL:"Lactose (légère)",lactS:"Lactose (sévère)",gluten:"Gluten",histamine:"Histamine",fodmap:"FODMAPs",intOther:"Autre",
  diet:"Régime alimentaire",dietNone:"Aucun",veg:"Végétarien",vegan:"Végan",gf:"Sans gluten",halal:"Halal",noPork:"Sans porc",
  cycle:"Cycle menstruel",cycReg:"Régulier (~28j)",cycIrreg:"Irrégulier",cycPeri:"Périménopause",cycMeno:"Ménopause",cycNA:"Ne s'applique pas",cycNo:"Préfère ne pas répondre",
  sleepH:"Sommeil (heures)",sleepQ:"Qualité du sommeil",sqGood:"Bon",sqMed:"Moyen (réveils)",sqBad:"Mauvais (insomnie)",
  stress:"Niveau de stress",stressDesc:"1 = Très détendu | 5 = Modéré | 10 = Épuisé, anxieux",
  workSched:"Horaires de travail",wsClass:"Journée classique (8h-18h)",wsLong:"Horaires longs",wsShift:"Décalés",wsNight:"Nuit",wsRemote:"Télétravail",wsVar:"Variable",
  mealTimes:"Heures habituelles des repas",mealPh:"ex: Petit-déj 7h30, Déj 13h, Dîner 20h30",
  mealsDay:"Repas par jour",breakfast:"Petit-déjeuner",bfYes:"Oui, toujours",bfSome:"Parfois",bfNo:"Non, jamais",
  snacking:"Grignotage entre les repas",snNever:"Jamais",snSome:"Parfois (2-3x/sem)",snOften:"Souvent (tous les jours)",snEvening:"Surtout le soir",
  snackType:"Type de grignotage",sweet:"Sucré",salty:"Salé",both:"Les deux",healthy:"Sain (fruits, noix)",
  alcohol:"Alcool",alcNo:"Jamais",alcRare:"Rarement (1-2/mois)",alcMod:"Modéré (2-3/sem)",alcReg:"Régulier (1+/jour)",
  coffee:"Cafés / thés par jour",cof0:"0",cof1:"1-2",cof2:"3-4",cof3:"5+",
  sodas:"Boissons sucrées / sodas",sodNo:"Jamais",sodRare:"Occasionnel",sodReg:"Régulier",sodDaily:"Quotidien",
  fruitsVeg:"Fruits et légumes par jour",fv1:"0-1",fv2:"2-3",fv3:"4-5",fv4:"5+",
  waterDay:"Eau par jour",mealsOut:"Repas à l'extérieur par semaine",
  dislikes:"Aliments DÉTESTÉS",dislikesPh:"ex: épinards, poisson cru...",dislikesD:"Ne mettez jamais ça dans mon programme",
  likes:"Aliments ADORÉS",likesPh:"ex: poulet, pâtes, avocat...",likesD:"Mettez-en le plus possible !",
  cuisines:"Cuisines préférées",cuMed:"Méditerranéenne",cuPT:"Portugaise",cuFR:"Française",cuAsia:"Asiatique",cuMex:"Mexicaine",cuUS:"Américaine",
  cookTime:"Temps pour cuisiner par repas",ct1:"5-10 min",ct2:"15-20 min",ct3:"20-30 min",ct4:"30+ min",
  cookLevel:"Niveau en cuisine",clBeg:"Débutant",clMid:"Intermédiaire",clAdv:"À l'aise",clChef:"Chef à la maison",
  cookFor:"Vous cuisinez pour",cf1:"1 personne",cf2:"2 personnes",cf3:"3-4 (famille)",
  mealPrep:"Meal prep le week-end ?",mpYes:"Oui, motivé(e) !",mpSimple:"Oui, si simple (max 1h30)",mpNo:"Non, je cuisine chaque jour",
  equip:"Équipement cuisine",eqFour:"Four",eqMicro:"Micro-ondes",eqBlend:"Blender",eqAir:"Airfryer",eqBasic:"Basique (plaques + casseroles)",eqSteam:"Cuiseur vapeur",eqPressure:"Cocotte-minute",
  budgetL:"Budget alimentation / semaine (au Portugal)",
  b1:"30-50 €",b1d:"Œufs, lentilles, sardines, poulet, légumes de saison",b2:"50-70 €",b2d:"+ thon, maquereau, saumon surgelé, viande hachée",b3:"70-100 €",b3d:"+ saumon frais, crevettes, bœuf, avocat",b4:"100+ €",b4d:"+ gambas, magret, produits bio",
  stores:"Où faites-vous vos courses ?",stLidl:"Lidl / Aldi",stPingo:"Pingo Doce",stCont:"Continente",stMarket:"Marché local",stBio:"Bio (Celeiro)",
  suppOpen:"Êtes-vous ouvert(e) à la supplémentation ?",soYes:"Oui, si c'est prouvé",soMaybe:"Le minimum possible",soNo:"Non, tout par l'alimentation",soAlready:"J'en prends déjà",
  suppInfo:"La supplémentation n'est jamais obligatoire. Mais en déficit calorique, certains nutriments sont difficiles à couvrir :",
  suppVitD:"Vitamine D — +15% énergie, meilleur sommeil",suppMag:"Magnésium — +20% qualité sommeil",suppOm3:"Oméga-3 — +10% récupération musculaire",
  supplements:"Compléments actuels",suppPh:"Aucun si pas de compléments",
  prevDiet:"Avez-vous déjà suivi un régime ?",pdNo:"Non, première fois",pdYes:"Oui",prevDetail:"Si oui, lequel et résultats ?",prevPh:"ex: Weight Watchers 2022, perdu 5kg, repris 7kg",
  obstacle:"Principal obstacle",obHunger:"La faim / Les envies",obTime:"Manque de temps",obBoring:"Manque de variété",obSocial:"Vie sociale",obCost:"Le coût",obMotiv:"Motivation sur la durée",
  progStyle:"Type de programme préféré",psStrict:"Très cadré (chaque repas détaillé)",psFlex:"Semi-flexible (cadre + alternatives)",psFree:"Flexible (principes + recettes libres)",
  motivL:"Qu'est-ce qui vous motiverait le plus ?",m1:"Résultats sur la balance",m2:"Me sentir mieux dans mes vêtements",m3:"Plus d'énergie",m4:"Améliorer ma santé",m5:"Performer à l'entraînement",
  finalNote:"Un dernier mot ?",finalPh:"Quelque chose qu'on devrait savoir...",
  onbDone:"Questionnaire envoyé !",onbDoneDesc:"Notre équipe va créer votre programme personnalisé sous 48h.",
  rgpdText:"J'accepte que mes données personnelles et de santé soient collectées et traitées par Bodyfit EMS Studio dans le cadre de la création de mon programme nutritionnel personnalisé. Mes données sont confidentielles et ne seront jamais partagées avec des tiers.",
},
pt:{
  login:"Entrar",signup:"Criar conta",email:"Email",password:"Palavra-passe",name:"Nome completo",loginBtn:"Entrar",signupBtn:"Criar conta",noAccount:"Ainda não tem conta?",hasAccount:"Já tem conta?",signupLink:"Criar conta",loginLink:"Entrar",
  logout:"Sair",dashboard:"Painel",questionnaire:"Questionário",program:"Meu programa",feedback:"Feedback",progress:"Progresso",
  welcome:"Bem-vindo",welcomeDesc:"O seu espaço de nutrição personalizado",startOnb:"Iniciar questionário",completeOnb:"Complete o questionário para receber o seu programa personalizado.",
  myProgram:"Meu Programa",noProgram:"O seu programa está a ser criado",noProgramDesc:"Após completar o questionário, a nossa equipa criará o seu programa em 48h.",downloadPdf:"Transferir PDF",
  weeklyFb:"Feedback semanal",fbDesc:"Preencha semanalmente para ajustar o próximo programa",
  weight:"Peso (kg)",waistFb:"Cintura (cm)",energy:"Energia (1-5)",hunger:"Fome (1-5)",adherence:"Adesão (%)",sleep:"Sono (h)",water:"Água (L/d)",mood:"Humor (1-5)",notes:"Notas",cycleFb:"Fase do ciclo",
  sendFb:"Enviar feedback",fbSent:"Feedback registado!",progressTitle:"Minha progressão",noData:"Sem dados ainda",weightChart:"Evolução do peso",
  currentWeight:"Peso atual",targetWeight:"Objetivo",remaining:"Restante",weekN:"Sem",next:"Continuar",back:"Voltar",submit:"Enviar",confirmEmail:"Verifique o seu email para confirmar a conta.",
  onb_p1:"Os seus dados",onb_p1d:"Para calcular as suas necessidades",onb_p2:"O seu objetivo",onb_p2d:"Que resultado pretende?",
  onb_p3:"Atividade física",onb_p3d:"O seu treino",onb_p4:"Saúde",onb_p4d:"Segurança do programa",
  onb_p5:"Estilo de vida",onb_p5d:"Sono, stress, ritmo",onb_p6:"Hábitos",onb_p6d:"Como come hoje",
  onb_p7:"Preferências",onb_p7d:"Gostos e cozinha",onb_p8:"Orçamento",onb_p8d:"Para adaptar os ingredientes",
  onb_p9:"Suplementação",onb_p9d:"Opcional",onb_p10:"Motivação",onb_p10d:"Para personalizar a abordagem",
  sex:"Sexo",male:"Masculino",female:"Feminino",age:"Idade",height:"Altura (cm)",waist:"Cintura (cm)",bodyFat:"Massa gorda (%)",targetW:"Peso objetivo (kg)",
  timeline:"Prazo",tl1:"1-2 meses",tl2:"3-4 meses",tl3:"6 meses",tl4:"1 ano",tl5:"Sem prazo",
  goal:"Objetivo principal",g1:"Perda de peso",g2:"Ganho de massa",g3:"Reequilíbrio",g4:"Performance",g5:"Saúde & Bem-estar",g6:"Manutenção",
  goalDetail:"Descreva numa frase",goalPh:"ex: Sentir-me bem / Ter mais energia",
  emsFreq:"Sessões EMS / semana",emsTime:"Momento da sessão EMS",emsMorning:"Manhã",emsNoon:"Meio-dia",emsAfternoon:"Tarde",emsEvening:"Noite",
  otherAct:"Outras atividades",noOther:"Apenas EMS",walk:"Caminhada",run:"Corrida",gym:"Musculação",swim:"Natação",yoga:"Yoga/Pilates",bike:"Bicicleta",other:"Outro",
  otherIntensity:"Intensidade das outras",intLight:"Ligeira",intMod:"Moderada",intHigh:"Intensa",
  dailyAct:"Dia-a-dia fora do desporto",sed:"Sedentário",light:"Ligeiramente ativo",actif:"Ativo",vActif:"Muito ativo",
  pathologies:"Patologias",pathNone:"Nenhuma",diab:"Diabetes",chol:"Colesterol",hyp:"Hipertensão",thyr:"Tiroide",sopk:"SOP",dig:"Problemas digestivos",pathOther:"Outro",
  pregnant:"Grávida ou a amamentar?",pregNo:"Não",pregYes:"Sim",pregNA:"N/A",
  meds:"Medicamentos",allergies:"Alergias alimentares",algNone:"Nenhuma",nuts:"Frutos secos",sea:"Marisco",egg:"Ovos",soy:"Soja",algOther:"Outro",
  intol:"Intolerâncias",intNone:"Nenhuma",lactL:"Lactose (ligeira)",lactS:"Lactose (severa)",gluten:"Glúten",histamine:"Histamina",fodmap:"FODMAPs",intOther:"Outro",
  diet:"Regime",dietNone:"Nenhum",veg:"Vegetariano",vegan:"Vegan",gf:"Sem glúten",halal:"Halal",noPork:"Sem porco",
  cycle:"Ciclo menstrual",cycReg:"Regular (~28d)",cycIrreg:"Irregular",cycPeri:"Perimenopausa",cycMeno:"Menopausa",cycNA:"N/A",cycNo:"Prefiro não responder",
  sleepH:"Sono (horas)",sleepQ:"Qualidade do sono",sqGood:"Bom",sqMed:"Médio",sqBad:"Mau (insónia)",
  stress:"Nível de stress",stressDesc:"1 = Muito relaxado | 5 = Moderado | 10 = Exausto",
  workSched:"Horário de trabalho",wsClass:"Dia clássico",wsLong:"Horários longos",wsShift:"Alternados",wsNight:"Noite",wsRemote:"Teletrabalho",wsVar:"Variável",
  mealTimes:"Horários das refeições",mealPh:"ex: Peq-almoço 7h30, Almoço 13h, Jantar 20h30",
  mealsDay:"Refeições por dia",breakfast:"Pequeno-almoço",bfYes:"Sim, sempre",bfSome:"Às vezes",bfNo:"Não, nunca",
  snacking:"Petiscos entre refeições",snNever:"Nunca",snSome:"Às vezes",snOften:"Frequentemente",snEvening:"Sobretudo à noite",
  snackType:"Tipo de petisco",sweet:"Doce",salty:"Salgado",both:"Ambos",healthy:"Saudável",
  alcohol:"Álcool",alcNo:"Nunca",alcRare:"Raramente",alcMod:"Moderado",alcReg:"Regular",
  coffee:"Cafés / chás por dia",cof0:"0",cof1:"1-2",cof2:"3-4",cof3:"5+",
  sodas:"Bebidas açucaradas",sodNo:"Nunca",sodRare:"Ocasional",sodReg:"Regular",sodDaily:"Diário",
  fruitsVeg:"Fruta e legumes por dia",fv1:"0-1",fv2:"2-3",fv3:"4-5",fv4:"5+",
  waterDay:"Água por dia",mealsOut:"Refeições fora por semana",
  dislikes:"Alimentos que DETESTA",dislikesPh:"ex: espinafres, peixe cru...",dislikesD:"Nunca colocar",
  likes:"Alimentos que ADORA",likesPh:"ex: frango, massa, abacate...",likesD:"Colocar o máximo!",
  cuisines:"Cozinhas preferidas",cuMed:"Mediterrânea",cuPT:"Portuguesa",cuFR:"Francesa",cuAsia:"Asiática",cuMex:"Mexicana",cuUS:"Americana",
  cookTime:"Tempo para cozinhar",ct1:"5-10 min",ct2:"15-20 min",ct3:"20-30 min",ct4:"30+ min",
  cookLevel:"Nível na cozinha",clBeg:"Iniciante",clMid:"Intermédio",clAdv:"À vontade",clChef:"Chef em casa",
  cookFor:"Cozinha para",cf1:"1 pessoa",cf2:"2 pessoas",cf3:"3-4 (família)",
  mealPrep:"Meal prep ao fim de semana?",mpYes:"Sim, motivado(a)!",mpSimple:"Sim, se simples",mpNo:"Não, cozinho cada dia",
  equip:"Equipamento cozinha",eqFour:"Forno",eqMicro:"Micro-ondas",eqBlend:"Liquidificador",eqAir:"Airfryer",eqBasic:"Básico",eqSteam:"Cozedor a vapor",eqPressure:"Panela de pressão",
  budgetL:"Orçamento alimentação / semana",b1:"30-50 €",b1d:"Ovos, lentilhas, sardinhas, frango",b2:"50-70 €",b2d:"+ atum, cavala, salmão congelado",b3:"70-100 €",b3d:"+ salmão fresco, camarões, vaca",b4:"100+ €",b4d:"+ gambas, magret, bio",
  stores:"Onde faz compras?",stLidl:"Lidl / Aldi",stPingo:"Pingo Doce",stCont:"Continente",stMarket:"Mercado local",stBio:"Bio (Celeiro)",
  suppOpen:"Aberto(a) à suplementação?",soYes:"Sim, se comprovado",soMaybe:"Mínimo possível",soNo:"Não, tudo pela alimentação",soAlready:"Já tomo",
  suppInfo:"A suplementação nunca é obrigatória. Mas em déficit calórico:",suppVitD:"Vitamina D — +15% energia",suppMag:"Magnésio — +20% sono",suppOm3:"Ómega-3 — +10% recuperação",
  supplements:"Suplementos atuais",suppPh:"Nenhum",
  prevDiet:"Já seguiu um regime?",pdNo:"Não, primeira vez",pdYes:"Sim",prevDetail:"Se sim, qual?",prevPh:"ex: Dukan 2020",
  obstacle:"Principal obstáculo",obHunger:"Fome / Desejos",obTime:"Falta de tempo",obBoring:"Monotonia",obSocial:"Vida social",obCost:"Custo",obMotiv:"Motivação",
  progStyle:"Tipo de programa",psStrict:"Muito estruturado",psFlex:"Semi-flexível",psFree:"Flexível",
  motivL:"O que o motivaria mais?",m1:"Resultados na balança",m2:"Sentir-me melhor na roupa",m3:"Mais energia",m4:"Melhorar saúde",m5:"Performance no treino",
  finalNote:"Uma última palavra?",finalPh:"Algo que devemos saber...",onbDone:"Questionário enviado!",onbDoneDesc:"A nossa equipa vai criar o seu programa em 48h.",
  rgpdText:"Aceito que os meus dados pessoais e de saúde sejam recolhidos e tratados pela Bodyfit EMS Studio para a criação do meu programa nutricional personalizado. Os meus dados são confidenciais e nunca serão partilhados com terceiros.",
},
en:{
  login:"Log in",signup:"Create account",email:"Email",password:"Password",name:"Full name",loginBtn:"Sign in",signupBtn:"Create my account",noAccount:"No account yet?",hasAccount:"Already have one?",signupLink:"Sign up",loginLink:"Sign in",
  logout:"Log out",dashboard:"Dashboard",questionnaire:"Questionnaire",program:"My program",feedback:"Feedback",progress:"Progress",
  welcome:"Welcome",welcomeDesc:"Your personalized nutrition space",startOnb:"Start the questionnaire",completeOnb:"Complete your nutritional profile to receive your personalized program.",
  myProgram:"My Program",noProgram:"Your program is being created",noProgramDesc:"Once the questionnaire is complete, our team will create your program within 48h.",downloadPdf:"Download PDF",
  weeklyFb:"Weekly feedback",fbDesc:"Fill in weekly to adjust your next program",
  weight:"Weight (kg)",waistFb:"Waist (cm)",energy:"Energy (1-5)",hunger:"Hunger (1-5)",adherence:"Adherence (%)",sleep:"Sleep (h)",water:"Water (L/d)",mood:"Mood (1-5)",notes:"Notes / How you feel",cycleFb:"Cycle phase",
  sendFb:"Send feedback",fbSent:"Feedback recorded!",progressTitle:"My progress",noData:"No data yet",weightChart:"Weight over time",
  currentWeight:"Current weight",targetWeight:"Target",remaining:"Remaining",weekN:"Wk",next:"Continue",back:"Back",submit:"Submit",confirmEmail:"Check your email to confirm your account.",
  onb_p1:"Your details",onb_p1d:"To calculate your needs",onb_p2:"Your goal",onb_p2d:"What result are you aiming for?",
  onb_p3:"Physical activity",onb_p3d:"Your training",onb_p4:"Health",onb_p4d:"Program safety",
  onb_p5:"Lifestyle",onb_p5d:"Sleep, stress, rhythm",onb_p6:"Current habits",onb_p6d:"How you eat today",
  onb_p7:"Food preferences",onb_p7d:"Tastes and cooking",onb_p8:"Budget",onb_p8d:"To adapt ingredients",
  onb_p9:"Supplements",onb_p9d:"Optional — your choice",onb_p10:"Motivation",onb_p10d:"To personalize the approach",
  sex:"Sex",male:"Male",female:"Female",age:"Age",height:"Height (cm)",waist:"Waist (cm)",bodyFat:"Body fat (%)",targetW:"Target weight (kg)",
  timeline:"Timeline",tl1:"1-2 months",tl2:"3-4 months",tl3:"6 months",tl4:"1 year",tl5:"No deadline",
  goal:"Main goal",g1:"Weight loss",g2:"Muscle gain",g3:"Rebalancing",g4:"Performance",g5:"Health & Wellbeing",g6:"Maintenance",
  goalDetail:"Describe in one sentence",goalPh:"ex: Feel great in my body / Have more energy",
  emsFreq:"EMS sessions per week",emsTime:"When do you do EMS?",emsMorning:"Morning",emsNoon:"Midday",emsAfternoon:"Afternoon",emsEvening:"Evening",
  otherAct:"Other activities",noOther:"EMS only",walk:"Walking",run:"Running",gym:"Weight training",swim:"Swimming",yoga:"Yoga/Pilates",bike:"Cycling",other:"Other",
  otherIntensity:"Intensity of other activities",intLight:"Light",intMod:"Moderate",intHigh:"Intense",
  dailyAct:"Daily routine (outside sport)",sed:"Sedentary (desk)",light:"Slightly active",actif:"Active",vActif:"Very active (physical work)",
  pathologies:"Conditions",pathNone:"None",diab:"Diabetes",chol:"High cholesterol",hyp:"Hypertension",thyr:"Thyroid",sopk:"PCOS",dig:"Digestive issues",pathOther:"Other",
  pregnant:"Pregnant or breastfeeding?",pregNo:"No",pregYes:"Yes",pregNA:"N/A",
  meds:"Medications",allergies:"Food allergies",algNone:"None",nuts:"Tree nuts",sea:"Seafood",egg:"Eggs",soy:"Soy",algOther:"Other",
  intol:"Intolerances",intNone:"None",lactL:"Lactose (mild)",lactS:"Lactose (severe)",gluten:"Gluten",histamine:"Histamine",fodmap:"FODMAPs",intOther:"Other",
  diet:"Specific diet",dietNone:"None",veg:"Vegetarian",vegan:"Vegan",gf:"Gluten-free",halal:"Halal",noPork:"No pork",
  cycle:"Menstrual cycle",cycReg:"Regular (~28d)",cycIrreg:"Irregular",cycPeri:"Perimenopause",cycMeno:"Menopause",cycNA:"N/A",cycNo:"Prefer not to say",
  sleepH:"Sleep (hours)",sleepQ:"Sleep quality",sqGood:"Good",sqMed:"Medium",sqBad:"Poor (insomnia)",
  stress:"Stress level",stressDesc:"1 = Very relaxed | 5 = Moderate | 10 = Exhausted",
  workSched:"Work schedule",wsClass:"Standard day",wsLong:"Long hours",wsShift:"Shift work",wsNight:"Night",wsRemote:"Remote",wsVar:"Variable",
  mealTimes:"Usual meal times",mealPh:"ex: Breakfast 7:30am, Lunch 1pm, Dinner 8:30pm",
  mealsDay:"Meals per day",breakfast:"Breakfast",bfYes:"Yes, always",bfSome:"Sometimes",bfNo:"Never",
  snacking:"Snacking between meals",snNever:"Never",snSome:"Sometimes",snOften:"Often (daily)",snEvening:"Mostly evening",
  snackType:"Type of snacks",sweet:"Sweet",salty:"Salty",both:"Both",healthy:"Healthy (fruit, nuts)",
  alcohol:"Alcohol",alcNo:"Never",alcRare:"Rarely",alcMod:"Moderate",alcReg:"Regular",
  coffee:"Coffees / teas per day",cof0:"0",cof1:"1-2",cof2:"3-4",cof3:"5+",
  sodas:"Sugary drinks / sodas",sodNo:"Never",sodRare:"Occasional",sodReg:"Regular",sodDaily:"Daily",
  fruitsVeg:"Fruit & veg per day",fv1:"0-1",fv2:"2-3",fv3:"4-5",fv4:"5+",
  waterDay:"Water per day",mealsOut:"Meals out per week",
  dislikes:"Foods you HATE",dislikesPh:"ex: spinach, raw fish...",dislikesD:"Never include these",
  likes:"Foods you LOVE",likesPh:"ex: chicken, pasta, avocado...",likesD:"Include as many as possible!",
  cuisines:"Cuisines you enjoy",cuMed:"Mediterranean",cuPT:"Portuguese",cuFR:"French",cuAsia:"Asian",cuMex:"Mexican",cuUS:"American",
  cookTime:"Cooking time per meal",ct1:"5-10 min",ct2:"15-20 min",ct3:"20-30 min",ct4:"30+ min",
  cookLevel:"Cooking skill",clBeg:"Beginner",clMid:"Intermediate",clAdv:"Comfortable",clChef:"Home chef",
  cookFor:"Cooking for",cf1:"Just me",cf2:"2 people",cf3:"3-4 (family)",
  mealPrep:"Weekend meal prep?",mpYes:"Yes, let's go!",mpSimple:"Yes, if simple",mpNo:"No, I cook daily",
  equip:"Kitchen equipment",eqFour:"Oven",eqMicro:"Microwave",eqBlend:"Blender",eqAir:"Airfryer",eqBasic:"Basic (stovetop + pots)",eqSteam:"Steamer",eqPressure:"Pressure cooker",
  budgetL:"Weekly food budget (Portugal)",b1:"€30-50",b1d:"Eggs, lentils, sardines, chicken",b2:"€50-70",b2d:"+ tuna, mackerel, frozen salmon",b3:"€70-100",b3d:"+ fresh salmon, shrimp, beef",b4:"€100+",b4d:"+ prawns, duck, organic",
  stores:"Where do you shop?",stLidl:"Lidl / Aldi",stPingo:"Pingo Doce",stCont:"Continente",stMarket:"Local market",stBio:"Organic (Celeiro)",
  suppOpen:"Open to supplements?",soYes:"Yes, if proven",soMaybe:"As few as possible",soNo:"No, food only",soAlready:"I already take some",
  suppInfo:"Supplements are never mandatory. But in caloric deficit:",suppVitD:"Vitamin D — +15% energy",suppMag:"Magnesium — +20% sleep quality",suppOm3:"Omega-3 — +10% recovery",
  supplements:"Current supplements",suppPh:"None",
  prevDiet:"Followed a diet before?",pdNo:"No, first time",pdYes:"Yes",prevDetail:"If yes, which one?",prevPh:"ex: Keto 2020, lost 8kg regained 10",
  obstacle:"Main obstacle",obHunger:"Hunger / Cravings",obTime:"Lack of time",obBoring:"Monotony",obSocial:"Social life",obCost:"Cost",obMotiv:"Staying motivated",
  progStyle:"Preferred program type",psStrict:"Very structured",psFlex:"Semi-flexible",psFree:"Flexible",
  motivL:"What would motivate you most?",m1:"Seeing scale results",m2:"Feeling better in clothes",m3:"More energy",m4:"Better health",m5:"Training performance",
  finalNote:"Any last words?",finalPh:"Anything we should know...",onbDone:"Questionnaire submitted!",onbDoneDesc:"Our team will create your personalized program within 48h.",
  rgpdText:"I agree that my personal and health data may be collected and processed by Bodyfit EMS Studio for the creation of my personalized nutrition program. My data is confidential and will never be shared with third parties.",
}
}

// ═══════════════════════════════════════════════════════
// CSS (gold theme, scoped)
// ═══════════════════════════════════════════════════════
const CSS = `
.np{--gold:#B8860B;--gold-l:#FFF8E7;--gold-d:#8B6508;--gold-xl:#FFFDF5;--bg:#FAFAF8;--bg2:#FFFFFF;--bg3:#F5F3EF;--bg4:#EDEAE4;--tx:#1A1A1A;--tx2:#5A5A5A;--tx3:#9A9A9A;--bd:#E0DDD8;--green:#1B7A45;--green-l:#E6F4EC;--red:#C43333;--red-l:#FDE8E8;--blue:#1A6FB5;--R:12px;font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;-webkit-font-smoothing:antialiased}
.np *{box-sizing:border-box}
.np .aw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,var(--bg) 0%,var(--gold-xl) 50%,var(--bg) 100%)}
.np .ac{width:100%;max-width:400px;background:var(--bg2);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.08);overflow:hidden}
.np .ah{padding:32px 32px 20px;text-align:center}
.np .logo{font-size:32px;font-weight:700;letter-spacing:-.5px}.np .logo em{font-style:normal;color:var(--gold)}
.np .logo-s{font-size:9px;letter-spacing:4px;color:var(--tx3);text-transform:uppercase;margin-top:2px}
.np .ab{padding:0 32px 32px}
.np .at{font-size:18px;font-weight:700;margin-bottom:4px}.np .ad{font-size:12px;color:var(--tx2);margin-bottom:20px}
.np .ae{padding:10px 14px;background:var(--red-l);color:var(--red);font-size:12px;border-radius:8px;margin-bottom:12px}
.np .as{padding:10px 14px;background:var(--green-l);color:var(--green);font-size:12px;border-radius:8px;margin-bottom:12px}
.np .al{display:flex;justify-content:center;gap:6px;margin-bottom:20px}
.np .lb{padding:6px 14px;border:1.5px solid var(--bd);border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;background:var(--bg2);transition:all .2s;font-family:inherit}
.np .lb.on{background:var(--gold);color:white;border-color:var(--gold)}
.np .f{margin-bottom:16px}.np .fl{font-size:11px;font-weight:600;color:var(--tx2);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;display:block}
.np .fl .rq{color:var(--red)}
.np .fi{width:100%;padding:11px 13px;border:1.5px solid var(--bd);border-radius:var(--R);font-family:inherit;font-size:14px;color:var(--tx);background:var(--bg2);transition:all .2s;outline:none}
.np .fi:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-l)}
.np .ta{width:100%;padding:11px 13px;border:1.5px solid var(--bd);border-radius:var(--R);font-family:inherit;font-size:14px;color:var(--tx);background:var(--bg2);min-height:70px;resize:vertical;outline:none}
.np .ta:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-l)}
.np .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 20px;border:none;border-radius:var(--R);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;width:100%}
.np .bg{background:var(--gold);color:white}.np .bg:hover{background:var(--gold-d)}.np .bg:disabled{background:var(--bg4);color:var(--tx3);cursor:not-allowed}
.np .bo{background:none;border:1.5px solid var(--bd);color:var(--tx2)}.np .bo:hover{background:var(--bg3)}
.np .bs{padding:8px 14px;font-size:12px;width:auto}
.np .ch{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.np .ci{padding:8px 14px;border:1.5px solid var(--bd);border-radius:30px;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;background:var(--bg2);user-select:none}
.np .ci:hover{border-color:var(--gold);background:var(--gold-l)}.np .ci.on{background:var(--gold);color:white;border-color:var(--gold)}
.np .sd{display:flex;gap:4px}.np .si{flex:1;aspect-ratio:1;max-width:36px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;background:var(--bg2)}
.np .si:hover{border-color:var(--gold)}.np .si.on{background:var(--gold);color:white;border-color:var(--gold)}
.np .bo2{padding:12px;border:1.5px solid var(--bd);border-radius:var(--R);cursor:pointer;transition:all .2s;background:var(--bg2);margin-bottom:6px}
.np .bo2:hover{border-color:var(--gold)}.np .bo2.on{border-color:var(--gold);background:var(--gold-l)}
.np .ob{max-width:640px;margin:0 auto;padding:20px 16px 60px}
.np .op{margin:20px 0;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden}
.np .of{height:100%;background:var(--gold);border-radius:3px;transition:width .4s}
.np .os{font-size:11px;color:var(--tx3);text-align:center;margin-bottom:16px}
.np .oh{font-size:28px;margin-bottom:8px}.np .ot{font-size:18px;font-weight:700;margin-bottom:4px}.np .od{font-size:12px;color:var(--tx2);margin-bottom:20px}
.np .br{display:flex;gap:8px;margin-top:20px}
.np .app{display:flex;min-height:100vh}
.np .sb{width:240px;background:var(--bg2);border-right:1px solid var(--bd);padding:20px 0;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50}
.np .sn{flex:1;padding:12px 10px}.np .si2{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;color:var(--tx2);border:none;background:none;width:100%;text-align:left;font-family:inherit}
.np .si2:hover{background:var(--bg3);color:var(--tx)}.np .si2.on{background:var(--gold-l);color:var(--gold-d);font-weight:600}
.np .si2 .ic{font-size:18px;width:24px;text-align:center}
.np .sf{padding:12px 16px;border-top:1px solid var(--bd)}.np .sa{width:36px;height:36px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px}
.np .mn{margin-left:240px;flex:1;padding:24px 28px;min-height:100vh}
.np .pt{font-size:22px;font-weight:700;margin-bottom:4px}.np .pd{font-size:13px;color:var(--tx2);margin-bottom:20px}
.np .cg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.np .cd{background:var(--bg2);border:1px solid var(--bd);border-radius:16px;padding:18px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.np .cl{font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.np .cv{font-size:28px;font-weight:700;color:var(--gold)}.np .cs{font-size:11px;color:var(--tx2);margin-top:4px}
.np .pc{background:linear-gradient(135deg,var(--gold-xl),var(--gold-l));border:1.5px solid var(--gold);border-radius:16px;padding:24px;margin-bottom:20px}
.np .pc h3{font-size:16px;margin-bottom:4px}.np .pc p{font-size:12px;color:var(--tx2)}
.np .sr{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bg3)}.np .sr:last-child{border:none}
.np .sl{font-size:12px;color:var(--tx2)}.np .sv{font-size:13px;font-weight:600}
.np .ca{height:180px;display:flex;align-items:flex-end;gap:3px;padding:8px 0;border-bottom:1px solid var(--bg4)}
.np .cb{flex:1;background:var(--gold-l);border-radius:4px 4px 0 0;min-height:4px;transition:height .5s}.np .cb:hover{background:var(--gold)}
.np .ct{display:flex;gap:3px;margin-top:4px}.np .ct span{flex:1;text-align:center;font-size:8px;color:var(--tx3)}
.np .fb{background:var(--bg2);border:1px solid var(--bd);border-radius:16px;padding:20px;margin-bottom:16px}
.np .fr{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.np .ib{padding:12px 14px;border-radius:var(--R);font-size:12px;line-height:1.5;margin:10px 0;background:var(--gold-l);border-left:3px solid var(--gold)}
.np .em{text-align:center;padding:40px 20px;color:var(--tx3)}.np .ei{font-size:48px;margin-bottom:12px}
.np .tg{font-size:12px;color:var(--tx2);text-align:center;margin-top:16px}.np .tg a{color:var(--gold);font-weight:600;cursor:pointer;text-decoration:none}
.np .mh{display:none;position:fixed;top:0;left:0;right:0;background:var(--bg2);border-bottom:1px solid var(--bd);padding:12px 16px;z-index:40;align-items:center;justify-content:space-between}
.np .mt{background:none;border:none;font-size:22px;cursor:pointer}
.np .mv{display:none;position:fixed;inset:0;background:rgba(0,0,0,.2);z-index:45}
.np .toast{position:fixed;bottom:20px;right:20px;padding:12px 20px;background:var(--gold);color:white;border-radius:var(--R);font-size:13px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,.08);z-index:100;animation:npSlide .3s ease}
@keyframes npSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes npFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.np .fin{animation:npFade .4s ease}
.np .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.np .ck{width:20px;height:20px;border:2px solid var(--bd);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .2s}
.np .ck.on{background:var(--gold);border-color:var(--gold)}
@media(max-width:768px){.np .sb{transform:translateX(-100%);transition:transform .3s}.np .sb.open{transform:translateX(0)}.np .mh{display:flex!important}.np .mv.show{display:block!important}.np .mn{margin-left:0;padding:68px 14px 24px}.np .fr{grid-template-columns:1fr}.np .g2{grid-template-columns:1fr}}
`

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9) }

// ═══════════════════════════════════════════════════════
// FIELD COMPONENTS
// ═══════════════════════════════════════════════════════
function Fld({ label, req, children }) {
  return <div className="f"><label className="fl">{label}{req && <span className="rq"> *</span>}</label>{children}</div>
}
function ChoiceSingle({ k, opts, label, d, set }) {
  return <Fld label={label}><div className="ch">{opts.map(o => <div key={o} className={"ci" + (d[k] === o ? " on" : "")} onClick={() => set(k, o)}>{o}</div>)}</div></Fld>
}
function ChoiceMulti({ k, opts, label, d, toggle }) {
  return <Fld label={label}><div className="ch">{opts.map(o => {
    const sel = d[k] && d[k].includes(o)
    return <div key={o} className={"ci" + (sel ? " on" : "")} onClick={() => toggle(k, o)}>{o}</div>
  })}</div></Fld>
}
function ScaleRow({ k, min, max, label, desc, d, set }) {
  return <div className="f"><label className="fl">{label}</label>{desc && <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 6 }}>{desc}</div>}<div className="sd">{Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n =>
    <div key={n} className={"si" + (d[k] === n ? " on" : "")} onClick={() => set(k, n)}>{n}</div>
  )}</div></div>
}
function BudgetCards({ k, opts, label, d, set }) {
  const icons = ["🥚", "🐟", "🥩", "🦐"]
  return <Fld label={label}>{opts.map((o, i) => <div key={o[0]} className={"bo2" + (d[k] === o[0] ? " on" : "")} onClick={() => set(k, o[0])}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>{icons[i]}</span><div><strong style={{ fontSize: 13 }}>{o[0]}</strong><span style={{ fontSize: 10, color: 'var(--tx2)', display: 'block', marginTop: 2 }}>{o[1]}</span></div></div>
  </div>)}</Fld>
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function NutritionPublic() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [profile, setProfile] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [page, setPage] = useState('dashboard')
  const [authMode, setAuthMode] = useState('login')
  const [lang, setLang] = useState('fr')
  const [onbStep, setOnbStep] = useState(0)
  const [onbData, setOnbData] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPw, setAuthPw] = useState('')
  const [authName, setAuthName] = useState('')
  const [fbW, setFbW] = useState(''); const [fbWa, setFbWa] = useState(''); const [fbEn, setFbEn] = useState('')
  const [fbHu, setFbHu] = useState(''); const [fbAd, setFbAd] = useState(''); const [fbSl, setFbSl] = useState('')
  const [fbWt, setFbWt] = useState(''); const [fbMo, setFbMo] = useState(''); const [fbNo, setFbNo] = useState('')

  const t = L[lang] || L.fr

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function onbSet(k, v) { setOnbData(p => ({ ...p, [k]: v })) }
  function onbToggle(k, v) {
    setOnbData(p => {
      const arr = p[k] ? [...p[k]] : []
      const i = arr.indexOf(v)
      if (i === -1) arr.push(v); else arr.splice(i, 1)
      return { ...p, [k]: arr }
    })
  }

  const loadUser = useCallback(async () => {
    try {
      const sess = await supabase.auth.getSession()
      if (!sess.data.session) { setLoading(false); return }
      const u = sess.data.session.user
      setUser(u)
      const acc = await supabase.from('client_accounts').select('*').eq('id', u.id).single()
      if (acc.data) { setAccount(acc.data); setLang(acc.data.language || 'fr') }
      if (acc.data?.nutrition_profile_id) {
        const prof = await supabase.from('nutrition_profiles').select('*').eq('id', acc.data.nutrition_profile_id).single()
        if (prof.data) setProfile(prof.data)
      }
      const fb = await supabase.from('weekly_feedbacks').select('*').eq('client_id', u.id).order('week_number', { ascending: true })
      if (fb.data) setFeedbacks(fb.data)
    } catch (e) { console.error('loadUser error', e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  async function doLogin(email, pw) {
    setAuthError('')
    const res = await supabase.auth.signInWithPassword({ email, password: pw })
    if (res.error) { setAuthError(res.error.message); return }
    await loadUser()
  }
  async function doSignup(email, pw, name) {
    setAuthError(''); setAuthSuccess('')
    const res = await supabase.auth.signUp({ email, password: pw })
    if (res.error) { setAuthError(res.error.message); return }
    if (res.data.user) {
      await supabase.from('client_accounts').insert({ id: res.data.user.id, email, name, language: lang })
      setAuthSuccess(t.confirmEmail)
    }
  }
  async function doLogout() {
    await supabase.auth.signOut()
    setUser(null); setAccount(null); setProfile(null); setFeedbacks([])
  }

  async function onbSubmit() {
    const id = uid()
    const dbData = { id, language: lang, status: 'new' }
    Object.keys(onbData).forEach(k => { dbData[k] = Array.isArray(onbData[k]) ? onbData[k].join(', ') : onbData[k] })
    const res = await supabase.from('nutrition_profiles').insert(dbData)
    if (res.error) { alert('Erreur: ' + res.error.message); return }
    await supabase.from('client_accounts').update({ onboarding_done: true, nutrition_profile_id: id }).eq('id', user.id)
    setAccount(p => ({ ...p, onboarding_done: true, nutrition_profile_id: id }))
    setPage('dashboard'); setOnbStep(0)
    showToast(t.onbDone)
  }

  async function submitFeedback(data) {
    const wk = feedbacks.length + 1
    const fb = { id: uid(), client_id: user.id, week_number: wk, ...data }
    const res = await supabase.from('weekly_feedbacks').insert(fb)
    if (res.error) { alert('Erreur: ' + res.error.message); return }
    setFeedbacks(p => [...p, fb])
    showToast(t.fbSent)
  }

  // ═══════════════════════════════════════════════════════
  // AUTH SCREEN
  // ═══════════════════════════════════════════════════════
  function renderAuth() {
    return <div className="aw"><div className="ac">
      <div className="ah"><div className="logo">BODY<em>FIT</em></div><div className="logo-s">EMS Studio</div></div>
      <div className="ab">
        <div className="al">
          {['fr', 'pt', 'en'].map(x => <button key={x} className={"lb" + (lang === x ? " on" : "")} onClick={() => setLang(x)}>{x.toUpperCase()}</button>)}
        </div>
        <div className="at">{authMode === 'login' ? t.login : t.signup}</div>
        <div className="ad">{authMode === 'signup' ? t.welcomeDesc : ''}</div>
        {authError && <div className="ae">{authError}</div>}
        {authSuccess && <div className="as">{authSuccess}</div>}
        {authMode === 'signup' && <div className="f"><label className="fl">{t.name} <span className="rq">*</span></label><input className="fi" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Sofia Almeida" /></div>}
        <div className="f"><label className="fl">{t.email} <span className="rq">*</span></label><input className="fi" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="votre@email.com" /></div>
        <div className="f"><label className="fl">{t.password} <span className="rq">*</span></label><input className="fi" type="password" value={authPw} onChange={e => setAuthPw(e.target.value)} placeholder="Min. 6 caracteres" onKeyDown={e => { if (e.key === 'Enter') authMode === 'login' ? doLogin(authEmail, authPw) : doSignup(authEmail, authPw, authName) }} /></div>
        <button className="btn bg" onClick={() => authMode === 'login' ? doLogin(authEmail, authPw) : doSignup(authEmail, authPw, authName)}>{authMode === 'login' ? t.loginBtn : t.signupBtn}</button>
        <div className="tg">{authMode === 'login' ? <>{t.noAccount} <a onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess('') }}>{t.signupLink}</a></> : <>{t.hasAccount} <a onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess('') }}>{t.loginLink}</a></>}</div>
      </div>
    </div></div>
  }

  // ═══════════════════════════════════════════════════════
  // ONBOARDING (10 steps)
  // ═══════════════════════════════════════════════════════
  function renderOnboarding() {
    const d = onbData; const s = onbSet; const m = onbToggle
    const steps = [
      // Step 1: Data
      <div key="1" className="fin">
        <div className="oh">📐</div><div className="ot">{t.onb_p1}</div><div className="od">{t.onb_p1d}</div>
        <Fld label={t.name}><input className="fi" value={d.name || ''} onChange={e => s('name', e.target.value)} /></Fld>
        <div className="g2"><ChoiceSingle k="sex" opts={[t.male, t.female]} label={t.sex} d={d} set={s} /><Fld label={t.age}><input className="fi" type="number" value={d.age || ''} onChange={e => s('age', e.target.value)} /></Fld></div>
        <div className="g2"><Fld label={t.weight}><input className="fi" type="number" placeholder="kg" value={d.weight || ''} onChange={e => s('weight', e.target.value)} /></Fld><Fld label={t.height}><input className="fi" type="number" placeholder="cm" value={d.height || ''} onChange={e => s('height', e.target.value)} /></Fld></div>
        <div className="g2"><Fld label={t.waist}><input className="fi" type="number" placeholder="cm" value={d.waist || ''} onChange={e => s('waist', e.target.value)} /></Fld><Fld label={t.bodyFat}><input className="fi" type="number" placeholder="%" value={d.body_fat || ''} onChange={e => s('body_fat', e.target.value)} /></Fld></div>
        <Fld label={t.targetW}><input className="fi" type="number" value={d.target_weight || ''} onChange={e => s('target_weight', e.target.value)} /></Fld>
        <ChoiceSingle k="timeline" opts={[t.tl1, t.tl2, t.tl3, t.tl4, t.tl5]} label={t.timeline} d={d} set={s} />
      </div>,
      // Step 2: Goal
      <div key="2" className="fin">
        <div className="oh">🎯</div><div className="ot">{t.onb_p2}</div><div className="od">{t.onb_p2d}</div>
        <ChoiceSingle k="goal" opts={[t.g1, t.g2, t.g3, t.g4, t.g5, t.g6]} label={t.goal} d={d} set={s} />
        <Fld label={t.goalDetail}><textarea className="ta" placeholder={t.goalPh} value={d.goal_detail || ''} onChange={e => s('goal_detail', e.target.value)} /></Fld>
      </div>,
      // Step 3: Activity
      <div key="3" className="fin">
        <div className="oh">💪</div><div className="ot">{t.onb_p3}</div><div className="od">{t.onb_p3d}</div>
        <ChoiceSingle k="ems_frequency" opts={["1x/sem", "2x/sem"]} label={t.emsFreq} d={d} set={s} />
        <ChoiceSingle k="ems_time" opts={[t.emsMorning, t.emsNoon, t.emsAfternoon, t.emsEvening]} label={t.emsTime} d={d} set={s} />
        <ChoiceMulti k="other_activities" opts={[t.noOther, t.walk, t.run, t.gym, t.swim, t.yoga, t.bike, t.other]} label={t.otherAct} d={d} toggle={m} />
        <ChoiceSingle k="other_intensity" opts={[t.intLight, t.intMod, t.intHigh]} label={t.otherIntensity} d={d} set={s} />
        <ChoiceSingle k="daily_activity" opts={[t.sed, t.light, t.actif, t.vActif]} label={t.dailyAct} d={d} set={s} />
      </div>,
      // Step 4: Health
      <div key="4" className="fin">
        <div className="oh">🏥</div><div className="ot">{t.onb_p4}</div><div className="od">{t.onb_p4d}</div>
        <ChoiceMulti k="pathologies" opts={[t.pathNone, t.diab, t.chol, t.hyp, t.thyr, t.sopk, t.dig, t.pathOther]} label={t.pathologies} d={d} toggle={m} />
        <ChoiceSingle k="pregnant" opts={[t.pregNo, t.pregYes, t.pregNA]} label={t.pregnant} d={d} set={s} />
        <Fld label={t.meds}><input className="fi" value={d.medications || ''} onChange={e => s('medications', e.target.value)} /></Fld>
        <ChoiceMulti k="allergies" opts={[t.algNone, t.nuts, t.sea, t.egg, t.soy, t.algOther]} label={t.allergies} d={d} toggle={m} />
        <ChoiceMulti k="intolerances" opts={[t.intNone, t.lactL, t.lactS, t.gluten, t.histamine, t.fodmap, t.intOther]} label={t.intol} d={d} toggle={m} />
        <ChoiceMulti k="diet_type" opts={[t.dietNone, t.veg, t.vegan, t.gf, t.halal, t.noPork]} label={t.diet} d={d} toggle={m} />
        <ChoiceSingle k="menstrual_cycle" opts={[t.cycReg, t.cycIrreg, t.cycPeri, t.cycMeno, t.cycNA, t.cycNo]} label={t.cycle} d={d} set={s} />
      </div>,
      // Step 5: Lifestyle
      <div key="5" className="fin">
        <div className="oh">🌙</div><div className="ot">{t.onb_p5}</div><div className="od">{t.onb_p5d}</div>
        <ChoiceSingle k="sleep_hours" opts={["<5h", "5-6h", "6-7h", "7-8h", "8h+"]} label={t.sleepH} d={d} set={s} />
        <ChoiceSingle k="sleep_quality" opts={[t.sqGood, t.sqMed, t.sqBad]} label={t.sleepQ} d={d} set={s} />
        <ScaleRow k="stress_level" min={1} max={10} label={t.stress} desc={t.stressDesc} d={d} set={s} />
        <ChoiceSingle k="work_schedule" opts={[t.wsClass, t.wsLong, t.wsShift, t.wsNight, t.wsRemote, t.wsVar]} label={t.workSched} d={d} set={s} />
        <Fld label={t.mealTimes}><input className="fi" placeholder={t.mealPh} value={d.meal_times || ''} onChange={e => s('meal_times', e.target.value)} /></Fld>
      </div>,
      // Step 6: Habits
      <div key="6" className="fin">
        <div className="oh">🍽</div><div className="ot">{t.onb_p6}</div><div className="od">{t.onb_p6d}</div>
        <ChoiceSingle k="meals_per_day" opts={["2", "3", "4", "5+"]} label={t.mealsDay} d={d} set={s} />
        <ChoiceSingle k="breakfast" opts={[t.bfYes, t.bfSome, t.bfNo]} label={t.breakfast} d={d} set={s} />
        <ChoiceSingle k="snacking" opts={[t.snNever, t.snSome, t.snOften, t.snEvening]} label={t.snacking} d={d} set={s} />
        <ChoiceSingle k="snack_type" opts={[t.sweet, t.salty, t.both, t.healthy]} label={t.snackType} d={d} set={s} />
        <ChoiceSingle k="alcohol" opts={[t.alcNo, t.alcRare, t.alcMod, t.alcReg]} label={t.alcohol} d={d} set={s} />
        <ChoiceSingle k="coffee" opts={[t.cof0, t.cof1, t.cof2, t.cof3]} label={t.coffee} d={d} set={s} />
        <ChoiceSingle k="sodas" opts={[t.sodNo, t.sodRare, t.sodReg, t.sodDaily]} label={t.sodas} d={d} set={s} />
        <ChoiceSingle k="fruits_veg" opts={[t.fv1, t.fv2, t.fv3, t.fv4]} label={t.fruitsVeg} d={d} set={s} />
        <ChoiceSingle k="water_intake" opts={["<1L", "1-1.5L", "1.5-2L", "2L+"]} label={t.waterDay} d={d} set={s} />
        <ChoiceSingle k="meals_outside" opts={["0-1", "2-3", "4-5", "6+"]} label={t.mealsOut} d={d} set={s} />
      </div>,
      // Step 7: Preferences
      <div key="7" className="fin">
        <div className="oh">👨‍🍳</div><div className="ot">{t.onb_p7}</div><div className="od">{t.onb_p7d}</div>
        <Fld label={t.dislikes}><textarea className="ta" placeholder={t.dislikesPh} value={d.dislikes || ''} onChange={e => s('dislikes', e.target.value)} /><div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{t.dislikesD}</div></Fld>
        <Fld label={t.likes}><textarea className="ta" placeholder={t.likesPh} value={d.likes || ''} onChange={e => s('likes', e.target.value)} /><div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{t.likesD}</div></Fld>
        <ChoiceMulti k="cuisine_prefs" opts={[t.cuMed, t.cuPT, t.cuFR, t.cuAsia, t.cuMex, t.cuUS]} label={t.cuisines} d={d} toggle={m} />
        <ChoiceSingle k="cook_time" opts={[t.ct1, t.ct2, t.ct3, t.ct4]} label={t.cookTime} d={d} set={s} />
        <ChoiceSingle k="cook_level" opts={[t.clBeg, t.clMid, t.clAdv, t.clChef]} label={t.cookLevel} d={d} set={s} />
        <ChoiceSingle k="cook_for" opts={[t.cf1, t.cf2, t.cf3]} label={t.cookFor} d={d} set={s} />
        <ChoiceSingle k="meal_prep" opts={[t.mpYes, t.mpSimple, t.mpNo]} label={t.mealPrep} d={d} set={s} />
        <ChoiceMulti k="equipment" opts={[t.eqFour, t.eqMicro, t.eqBlend, t.eqAir, t.eqBasic, t.eqSteam, t.eqPressure]} label={t.equip} d={d} toggle={m} />
      </div>,
      // Step 8: Budget
      <div key="8" className="fin">
        <div className="oh">💰</div><div className="ot">{t.onb_p8}</div><div className="od">{t.onb_p8d}</div>
        <BudgetCards k="weekly_budget" opts={[[t.b1, t.b1d], [t.b2, t.b2d], [t.b3, t.b3d], [t.b4, t.b4d]]} label={t.budgetL} d={d} set={s} />
        <ChoiceMulti k="grocery_stores" opts={[t.stLidl, t.stPingo, t.stCont, t.stMarket, t.stBio]} label={t.stores} d={d} toggle={m} />
      </div>,
      // Step 9: Supplements
      <div key="9" className="fin">
        <div className="oh">💊</div><div className="ot">{t.onb_p9}</div><div className="od">{t.onb_p9d}</div>
        <div className="ib">{t.suppInfo}<br /><br />&#8226; {t.suppVitD}<br />&#8226; {t.suppMag}<br />&#8226; {t.suppOm3}</div>
        <ChoiceSingle k="open_to_supplements" opts={[t.soYes, t.soMaybe, t.soNo, t.soAlready]} label={t.suppOpen} d={d} set={s} />
      </div>,
      // Step 10: Motivation
      <div key="10" className="fin">
        <div className="oh">🔥</div><div className="ot">{t.onb_p10}</div><div className="od">{t.onb_p10d}</div>
        <ChoiceSingle k="previous_diet" opts={[t.pdNo, t.pdYes]} label={t.prevDiet} d={d} set={s} />
        <Fld label={t.prevDetail}><input className="fi" placeholder={t.prevPh} value={d.previous_diet_detail || ''} onChange={e => s('previous_diet_detail', e.target.value)} /></Fld>
        <ChoiceMulti k="main_obstacle" opts={[t.obHunger, t.obTime, t.obBoring, t.obSocial, t.obCost, t.obMotiv]} label={t.obstacle} d={d} toggle={m} />
        <ChoiceSingle k="program_style" opts={[t.psStrict, t.psFlex, t.psFree]} label={t.progStyle} d={d} set={s} />
        <ChoiceMulti k="motivation" opts={[t.m1, t.m2, t.m3, t.m4, t.m5]} label={t.motivL} d={d} toggle={m} />
        <Fld label={t.finalNote}><textarea className="ta" placeholder={t.finalPh} value={d.final_note || ''} onChange={e => s('final_note', e.target.value)} /></Fld>
        <div className="f" style={{ marginTop: 16, padding: 14, background: 'var(--bg3)', borderRadius: 'var(--R)', border: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => s('rgpd', d.rgpd ? '' : 'yes')}>
            <div className={"ck" + (d.rgpd ? " on" : "")}>{d.rgpd && <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>&#10003;</span>}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>{t.rgpdText}</div>
          </div>
        </div>
      </div>
    ]
    const total = steps.length
    const pct = Math.round((onbStep + 1) / total * 100)
    return <div className="ob">
      <div style={{ textAlign: 'center', padding: '16px 0' }}><div className="logo">BODY<em>FIT</em></div></div>
      <div className="op"><div className="of" style={{ width: pct + '%' }} /></div>
      <div className="os">{onbStep + 1} / {total}</div>
      {steps[onbStep]}
      <div className="br">
        {onbStep > 0 && <button className="btn bo" onClick={() => { setOnbStep(s => s - 1); window.scrollTo(0, 0) }}>{t.back}</button>}
        {onbStep < total - 1
          ? <button className="btn bg" onClick={() => { setOnbStep(s => s + 1); window.scrollTo(0, 0) }}>{t.next}</button>
          : <button className="btn bg" onClick={onbSubmit}>{t.submit} →</button>}
      </div>
    </div>
  }

  // ═══════════════════════════════════════════════════════
  // APP (dashboard + program + feedback + progress)
  // ═══════════════════════════════════════════════════════
  function renderApp() {
    const a = account; const name = a?.name?.split(' ')[0] || ''; const initial = a?.name?.[0] || '?'
    const hasProg = a?.active_program_url; const lastFb = feedbacks.length ? feedbacks[feedbacks.length - 1] : null
    const lastW = lastFb?.weight || (profile ? parseFloat(profile.weight) : null)
    const targetW = profile ? parseFloat(profile.target_weight) : null
    const remaining = lastW && targetW ? Math.round((lastW - targetW) * 10) / 10 : null

    const fbForm = <div className="fb">
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t.weekN} {feedbacks.length + 1}</div>
      <div className="fr"><Fld label={t.weight}><input className="fi" type="number" step="0.1" placeholder="kg" value={fbW} onChange={e => setFbW(e.target.value)} /></Fld><Fld label={t.waistFb}><input className="fi" type="number" step="0.1" placeholder="cm" value={fbWa} onChange={e => setFbWa(e.target.value)} /></Fld></div>
      <div className="fr"><Fld label={t.energy}><input className="fi" type="number" placeholder="1-5" value={fbEn} onChange={e => setFbEn(e.target.value)} /></Fld><Fld label={t.hunger}><input className="fi" type="number" placeholder="1-5" value={fbHu} onChange={e => setFbHu(e.target.value)} /></Fld></div>
      <div className="fr"><Fld label={t.adherence}><input className="fi" type="number" placeholder="0-100" value={fbAd} onChange={e => setFbAd(e.target.value)} /></Fld><Fld label={t.sleep}><input className="fi" type="number" step="0.5" placeholder="h" value={fbSl} onChange={e => setFbSl(e.target.value)} /></Fld></div>
      <div className="fr"><Fld label={t.water}><input className="fi" type="number" step="0.1" placeholder="L" value={fbWt} onChange={e => setFbWt(e.target.value)} /></Fld><Fld label={t.mood}><input className="fi" type="number" placeholder="1-5" value={fbMo} onChange={e => setFbMo(e.target.value)} /></Fld></div>
      <Fld label={t.notes}><textarea className="ta" placeholder="" value={fbNo} onChange={e => setFbNo(e.target.value)} /></Fld>
      <button className="btn bg" onClick={() => submitFeedback({ weight: parseFloat(fbW) || null, waist: parseFloat(fbWa) || null, energy: parseInt(fbEn) || null, hunger: parseInt(fbHu) || null, adherence: parseInt(fbAd) || null, sleep_hours: parseFloat(fbSl) || null, water_liters: parseFloat(fbWt) || null, mood: parseInt(fbMo) || null, notes: fbNo })}>{t.sendFb} →</button>
    </div>

    const navItems = [['dashboard', '📊', t.dashboard], ['program', '📋', t.program], ['feedback', '💬', t.feedback], ['progress', '📈', t.progress]]

    return <div className="app">
      <aside className={"sb" + (sidebarOpen ? " open" : "")}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--bd)' }}><div className="logo" style={{ fontSize: 22 }}>BODY<em>FIT</em></div></div>
        <nav className="sn">{navItems.map(([k, ic, lb]) =>
          <button key={k} className={"si2" + (page === k ? " on" : "")} onClick={() => { setPage(k); setSidebarOpen(false) }}><span className="ic">{ic}</span>{lb}</button>
        )}</nav>
        <div className="sf">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="sa">{initial}</div><div><div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div><div style={{ fontSize: 10, color: 'var(--tx3)' }}>{a?.email}</div></div></div>
          <button className="btn bo bs" style={{ marginTop: 10, width: '100%' }} onClick={doLogout}>{t.logout}</button>
        </div>
      </aside>
      <div className="mh"><button className="mt" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button><div className="logo" style={{ fontSize: 18 }}>BODY<em>FIT</em></div><div className="sa" style={{ width: 30, height: 30, fontSize: 12 }}>{initial}</div></div>
      <div className={"mv" + (sidebarOpen ? " show" : "")} onClick={() => setSidebarOpen(false)} />
      <main className="mn"><div className="fin">
        {page === 'dashboard' && <>
          <div className="pt">{t.welcome}, {name} 👋</div><div className="pd">{t.welcomeDesc}</div>
          {hasProg ? <div className="pc"><h3>{t.myProgram}</h3><p>Programme actif</p><div style={{ marginTop: 14 }}><a href={a.active_program_url} target="_blank" rel="noreferrer" className="btn bg bs">{t.downloadPdf} 📥</a></div></div>
            : a?.onboarding_done ? <div className="pc"><h3>{t.noProgram} ⏳</h3><p>{t.noProgramDesc}</p></div>
            : <div className="pc"><h3>{t.startOnb}</h3><p>{t.completeOnb}</p><div style={{ marginTop: 14 }}><button className="btn bg bs" onClick={() => setAccount(p => ({ ...p, onboarding_done: false }))}>→ {t.startOnb}</button></div></div>}
          <div className="cg">
            {lastW && <div className="cd"><div style={{ fontSize: 28, float: 'right', marginTop: -4 }}>⚖️</div><div className="cl">{t.currentWeight}</div><div className="cv">{lastW}<span style={{ fontSize: 14, color: 'var(--tx2)' }}> kg</span></div></div>}
            {targetW && <div className="cd"><div style={{ fontSize: 28, float: 'right', marginTop: -4 }}>🎯</div><div className="cl">{t.targetWeight}</div><div className="cv" style={{ color: 'var(--green)' }}>{targetW}<span style={{ fontSize: 14, color: 'var(--tx2)' }}> kg</span></div></div>}
            {remaining > 0 && <div className="cd"><div style={{ fontSize: 28, float: 'right', marginTop: -4 }}>🏁</div><div className="cl">{t.remaining}</div><div className="cv" style={{ color: 'var(--blue)' }}>{remaining}<span style={{ fontSize: 14, color: 'var(--tx2)' }}> kg</span></div></div>}
            <div className="cd"><div style={{ fontSize: 28, float: 'right', marginTop: -4 }}>📊</div><div className="cl">Feedbacks</div><div className="cv">{feedbacks.length}</div></div>
          </div>
          {lastFb && <div className="cd"><div className="cl">Dernier feedback — {t.weekN} {lastFb.week_number}</div>
            <div className="sr"><span className="sl">{t.energy}</span><span className="sv">{lastFb.energy}/5</span></div>
            <div className="sr"><span className="sl">{t.hunger}</span><span className="sv">{lastFb.hunger}/5</span></div>
            <div className="sr"><span className="sl">{t.adherence}</span><span className="sv">{lastFb.adherence}%</span></div>
            <div className="sr"><span className="sl">{t.mood}</span><span className="sv">{lastFb.mood}/5</span></div>
          </div>}
        </>}
        {page === 'program' && <>
          <div className="pt">{t.myProgram}</div>
          {hasProg ? <div className="pc"><h3>Programme actif ✅</h3><div style={{ marginTop: 14 }}><a href={a.active_program_url} target="_blank" rel="noreferrer" className="btn bg bs">{t.downloadPdf} 📥</a></div></div>
            : <div className="em"><div className="ei">📋</div><div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx2)', marginBottom: 4 }}>{t.noProgram}</div><div style={{ fontSize: 12, lineHeight: 1.5 }}>{t.noProgramDesc}</div></div>}
        </>}
        {page === 'feedback' && <>
          <div className="pt">{t.weeklyFb}</div><div className="pd">{t.fbDesc}</div>
          {fbForm}
          {feedbacks.length > 0 && <div className="cd" style={{ marginTop: 16 }}><div className="cl">Historique</div>
            {[...feedbacks].reverse().map(fb => <div key={fb.id} className="sr"><span className="sl">{t.weekN} {fb.week_number}</span><span className="sv">{fb.weight ? fb.weight + 'kg' : '—'} | E:{fb.energy} | A:{fb.adherence}%</span></div>)}
          </div>}
        </>}
        {page === 'progress' && <>
          <div className="pt">{t.progressTitle}</div>
          {!feedbacks.length ? <div className="em"><div className="ei">📈</div><div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx2)' }}>{t.noData}</div></div> : <>
            {(() => { const ws = feedbacks.filter(f => f.weight).map(f => f.weight); if (!ws.length) return null; const mn = Math.min(...ws) - 2; const mx = Math.max(...ws) + 2; const rng = mx - mn || 1; return <div className="cd" style={{ gridColumn: 'span 2' }}><div className="cl">{t.weightChart}</div><div className="ca">{ws.map((w, i) => <div key={i} className="cb" style={{ height: Math.max(((w - mn) / rng) * 100, 8) + '%' }} title={w + 'kg'} />)}</div><div className="ct">{feedbacks.map((_, i) => <span key={i}>{t.weekN}{i + 1}</span>)}</div></div> })()}
            <div className="cd" style={{ marginTop: 14 }}><div className="cl">Details</div>
              {feedbacks.map(fb => <div key={fb.id} className="sr"><span className="sl" style={{ minWidth: 50, fontWeight: 600 }}>{t.weekN} {fb.week_number}</span><span className="sv" style={{ fontSize: 11 }}>{fb.weight ? fb.weight + 'kg' : '—'} | E:{fb.energy}/5 | F:{fb.hunger || '—'}/5 | A:{fb.adherence || '—'}% | 😊{fb.mood || '—'}/5</span></div>)}
            </div>
          </>}
        </>}
      </div></main>
    </div>
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  if (loading) return <div className="np"><style>{CSS}</style><div className="aw"><div style={{ textAlign: 'center' }}><div className="logo">BODY<em>FIT</em></div><p style={{ marginTop: 8, color: 'var(--tx3)' }}>Chargement...</p></div></div></div>
  return <div className="np">
    <style>{CSS}</style>
    {!user && renderAuth()}
    {user && account && !account.onboarding_done && renderOnboarding()}
    {user && account && account.onboarding_done && renderApp()}
    {toast && <div className="toast">{toast}</div>}
  </div>
}
