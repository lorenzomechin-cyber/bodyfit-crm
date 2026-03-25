export const SUB = {
  "12m": { cr: 48, mo: 12 },
  "6m": { cr: 24, mo: 6 },
  "3m": { cr: 12, mo: 3 },
  "p10": { cr: 10 },
  "p15": { cr: 15 },
  "p20": { cr: 20 },
  "premium": { cr: 999, mo: 12 }
}

export const SOURCES = ["recommendation", "socialMedia", "internetSearch", "studio", "advertising", "oldClient"]
export const STATUSES = ["active", "inactive", "suspended"]
export const LSTAGES = ["notContacted", "sessionBooked", "sessionDone", "converted", "lost"]
export const LCOL = {
  notContacted: "#6B6560",
  sessionBooked: "#C47F17",
  sessionDone: "#2E6DA4",
  converted: "#2D8C5A",
  lost: "#C0392B"
}
