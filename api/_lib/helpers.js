export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function daysTo(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 864e5)
}

export function nowHour() {
  return new Date().getHours()
}

export function dayOfWeek() {
  return new Date().getDay() // 0=Sun, 1=Mon, ...
}

export function isWorkday() {
  const d = dayOfWeek()
  return d >= 1 && d <= 6 // Mon-Sat
}

export function formatDateFR(d) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function detectLang(phone) {
  if (!phone) return 'pt'
  const clean = phone.replace(/[\s\-()]/g, '')
  if (clean.startsWith('+351') || clean.startsWith('351')) return 'pt'
  if (clean.startsWith('+33') || clean.startsWith('33')) return 'fr'
  if (clean.startsWith('+55') || clean.startsWith('55')) return 'pt'
  return 'en'
}

export const WA_MESSAGES = {
  reminder24h: {
    pt: (name, date, time) => `Olá ${name}! 👋\n\nLembrete da sua sessão EMS amanhã ${date} às ${time} na BodyFit Campo de Ourique.\n\nAté amanhã! 💪`,
    fr: (name, date, time) => `Bonjour ${name} ! 👋\n\nRappel de votre séance EMS demain ${date} à ${time} chez BodyFit Campo de Ourique.\n\nÀ demain ! 💪`,
    en: (name, date, time) => `Hi ${name}! 👋\n\nReminder of your EMS session tomorrow ${date} at ${time} at BodyFit Campo de Ourique.\n\nSee you tomorrow! 💪`,
  },
  reminder2h: {
    pt: (name, time) => `Olá ${name}! ⏰\n\nEsperamos por si daqui a 2h às ${time} na BodyFit.\n\nAté já!`,
    fr: (name, time) => `Bonjour ${name} ! ⏰\n\nOn vous attend dans 2h à ${time} chez BodyFit.\n\nÀ tout à l'heure !`,
    en: (name, time) => `Hi ${name}! ⏰\n\nWe're expecting you in 2 hours at ${time} at BodyFit.\n\nSee you soon!`,
  },
  noshow: {
    pt: (name) => `Olá ${name}, reparámos na sua ausência hoje na BodyFit. Gostaria de remarcar a sua sessão? 😊`,
    fr: (name) => `Bonjour ${name}, nous avons remarqué votre absence aujourd'hui chez BodyFit. Souhaitez-vous reprogrammer votre séance ? 😊`,
    en: (name) => `Hi ${name}, we noticed your absence today at BodyFit. Would you like to reschedule your session? 😊`,
  },
  trialFollowUp: {
    pt: (name) => `Olá ${name}! 👋\n\nÉ a BodyFit Campo de Ourique. Esperamos que tenha gostado da sua sessão de teste EMS!\n\nGostaria de conversar ou agendar uma nova sessão? Adorávamos vê-lo(a) novamente! 💪`,
    fr: (name) => `Bonjour ${name} ! 👋\n\nC'est BodyFit Campo de Ourique. Nous espérons que votre séance d'essai EMS vous a plu !\n\nSouhaitez-vous en discuter ou réserver une nouvelle séance ? On serait ravis de vous revoir ! 💪`,
    en: (name) => `Hi ${name}! 👋\n\nThis is BodyFit Campo de Ourique. We hope you enjoyed your EMS trial session!\n\nWould you like to discuss or book another session? We'd love to see you again! 💪`,
  },
  renewalAlert: {
    pt: (name, days) => `Olá ${name}! ⚠️\n\nA sua subscrição BodyFit expira em ${days} dia${days > 1 ? 's' : ''}. Contacte-nos para renovar e não perder os seus progressos! 💪`,
    fr: (name, days) => `Bonjour ${name} ! ⚠️\n\nVotre abonnement BodyFit expire dans ${days} jour${days > 1 ? 's' : ''}. Contactez-nous pour renouveler et ne pas perdre vos acquis ! 💪`,
    en: (name, days) => `Hi ${name}! ⚠️\n\nYour BodyFit subscription expires in ${days} day${days > 1 ? 's' : ''}. Contact us to renew and keep your progress! 💪`,
  },
  renewalSoft: {
    pt: (name, date) => `Olá ${name}! 📋\n\nA sua subscrição BodyFit expira a ${date}. Pense em renovar para continuar a sua progressão! 💪`,
    fr: (name, date) => `Bonjour ${name} ! 📋\n\nVotre abonnement BodyFit expire le ${date}. Pensez à le renouveler pour continuer votre progression ! 💪`,
    en: (name, date) => `Hi ${name}! 📋\n\nYour BodyFit subscription expires on ${date}. Consider renewing to continue your progress! 💪`,
  },
  birthday: {
    pt: (name) => `Feliz aniversário ${name}! 🎂🎉\n\nToda a equipa BodyFit deseja-lhe um dia maravilhoso!\n\nAté breve no estúdio! 💪`,
    fr: (name) => `Joyeux anniversaire ${name} ! 🎂🎉\n\nToute l'équipe BodyFit vous souhaite une magnifique journée !\n\nÀ très bientôt au studio ! 💪`,
    en: (name) => `Happy birthday ${name}! 🎂🎉\n\nThe whole BodyFit team wishes you a wonderful day!\n\nSee you soon at the studio! 💪`,
  },
  reviewRequest: {
    pt: (name, url) => `Obrigado pela sua sessão hoje ${name}! 💪\n\nSe tiver 30 segundos, uma avaliação no Google ajuda-nos imenso:\n${url}\n\nObrigado e até breve! 🙏`,
    fr: (name, url) => `Merci pour votre séance aujourd'hui ${name} ! 💪\n\nSi vous avez 30 secondes, un avis Google nous aide énormément :\n${url}\n\nMerci et à bientôt ! 🙏`,
    en: (name, url) => `Thanks for your session today ${name}! 💪\n\nIf you have 30 seconds, a Google review helps us a lot:\n${url}\n\nThank you and see you soon! 🙏`,
  },
  welcomeLead: {
    pt: (name) => `Olá ${name}! 👋\n\nObrigado pelo seu interesse na BodyFit Campo de Ourique! 💪\n\nVamos contactá-lo(a) muito em breve para agendar a sua sessão de teste EMS gratuita.\n\nAté já!`,
    fr: (name) => `Bonjour ${name} ! 👋\n\nMerci pour votre intérêt pour BodyFit Campo de Ourique ! 💪\n\nNous allons vous contacter très bientôt pour programmer votre séance d'essai EMS gratuite.\n\nÀ très vite !`,
    en: (name) => `Hi ${name}! 👋\n\nThank you for your interest in BodyFit Campo de Ourique! 💪\n\nWe'll contact you very soon to schedule your free EMS trial session.\n\nSee you soon!`,
  },
  morningBriefing: {
    pt: (date, bookingsList, expiring, trials, lowCredits) => `☀️ *Bom dia! Briefing BodyFit — ${date}*\n\n📅 *Sessões hoje:*\n${bookingsList || '  Nenhuma reserva'}\n\n⚠️ *Ações urgentes:*\n  • ${expiring} contrato(s) a expirar esta semana\n  • ${trials} teste(s) a relançar\n  • ${lowCredits} cliente(s) créditos baixos\n\nBom dia! 💪`,
    fr: (date, bookingsList, expiring, trials, lowCredits) => `☀️ *Bonjour ! Briefing BodyFit — ${date}*\n\n📅 *Séances aujourd'hui:*\n${bookingsList || '  Aucune réservation'}\n\n⚠️ *Actions urgentes:*\n  • ${expiring} contrat(s) expire(nt) cette semaine\n  • ${trials} essai(s) à relancer\n  • ${lowCredits} client(s) crédits bas\n\nBonne journée ! 💪`,
    en: (date, bookingsList, expiring, trials, lowCredits) => `☀️ *Good morning! BodyFit Briefing — ${date}*\n\n📅 *Sessions today:*\n${bookingsList || '  No bookings'}\n\n⚠️ *Urgent actions:*\n  • ${expiring} contract(s) expiring this week\n  • ${trials} trial(s) to follow up\n  • ${lowCredits} client(s) low credits\n\nHave a great day! 💪`,
  },
  generalGreeting: {
    pt: (name) => `Olá ${name}! É a BodyFit Campo de Ourique 💪`,
    fr: (name) => `Bonjour ${name} ! C'est BodyFit Campo de Ourique 💪`,
    en: (name) => `Hi ${name}! This is BodyFit Campo de Ourique 💪`,
  },
  trialReminder: {
    pt: (name) => `Olá ${name}! Lembramos da sua sessão de teste EMS prevista na BodyFit Campo de Ourique. Esperamos por si! 💪`,
    fr: (name) => `Bonjour ${name} ! On vous rappelle votre séance d'essai EMS prévue chez BodyFit Campo de Ourique. On a hâte de vous voir ! 💪`,
    en: (name) => `Hi ${name}! Reminder of your EMS trial session at BodyFit Campo de Ourique. We look forward to seeing you! 💪`,
  },
  sessionReminder: {
    pt: (name, time) => `Olá ${name}! Lembrete da sua sessão EMS amanhã às ${time} na BodyFit. Até amanhã! 💪`,
    fr: (name, time) => `Bonjour ${name} ! Rappel de votre séance EMS demain à ${time} chez BodyFit. À demain ! 💪`,
    en: (name, time) => `Hi ${name}! Reminder of your EMS session tomorrow at ${time} at BodyFit. See you tomorrow! 💪`,
  },
  nutritionProgramReady: {
    pt: (name, url) => `Olá ${name}! 🥗\n\nO seu programa nutricional personalizado está pronto!\n\n📋 Aceda aqui: ${url}\n\nQualquer dúvida, estamos à disposição. Bom apetite! 💪`,
    fr: (name, url) => `Bonjour ${name} ! 🥗\n\nVotre programme nutritionnel personnalisé est prêt !\n\n📋 Accédez-y ici : ${url}\n\nN'hésitez pas si vous avez des questions. Bon appétit ! 💪`,
    en: (name, url) => `Hi ${name}! 🥗\n\nYour personalized nutrition program is ready!\n\n📋 Access it here: ${url}\n\nFeel free to reach out with questions. Bon appétit! 💪`,
  },
  weeklyFeedbackReminder: {
    pt: (name, url) => `Olá ${name}! 📊\n\nÉ hora do seu check-in semanal! Leva apenas 2 minutos.\n\n👉 ${url}\n\nO seu feedback ajuda-nos a ajustar o programa. Obrigado! 💪`,
    fr: (name, url) => `Bonjour ${name} ! 📊\n\nC'est l'heure de votre check-in hebdomadaire ! Ça prend 2 minutes.\n\n👉 ${url}\n\nVotre feedback nous aide à ajuster le programme. Merci ! 💪`,
    en: (name, url) => `Hi ${name}! 📊\n\nTime for your weekly check-in! It only takes 2 minutes.\n\n👉 ${url}\n\nYour feedback helps us adjust the program. Thank you! 💪`,
  },
}

export function getMsg(key, lang, ...args) {
  const templates = WA_MESSAGES[key]
  if (!templates) return ''
  const fn = templates[lang] || templates['pt']
  return fn(...args)
}
