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
