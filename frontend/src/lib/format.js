// Small presentation helpers. No game logic lives here — the backend owns truth.

/** Seconds -> "m:ss". */
export function formatTimer(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Player with the highest backend-computed score (or null). */
export function leaderOf(players) {
  if (!players || players.length === 0) return null
  return [...players].sort((a, b) => b.score - a.score)[0]
}

/** Players sorted by score, descending. */
export function rankedPlayers(players) {
  return [...(players || [])].sort((a, b) => b.score - a.score)
}

/**
 * Urgency band for the match timer. The backend still owns match end — this is
 * only a visual cue. < 30s critical, < 60s urgent, otherwise normal.
 */
export function timerUrgency(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  if (s <= 30) return 'critical'
  if (s <= 60) return 'urgent'
  return ''
}

/**
 * Whole seconds left until an ISO deadline, relative to `now` (ms). Never
 * negative. The backend remains authoritative for actual expiry; this is a
 * display countdown only.
 */
export function secondsLeft(expiresAt, now) {
  if (!expiresAt) return null
  const end = Date.parse(expiresAt)
  if (Number.isNaN(end)) return null
  return Math.max(0, Math.ceil((end - now) / 1000))
}

/**
 * Aggregate network pressure derived from per-link load. Returns the 0..1 ratio
 * of total current load to total capacity plus a Low/Medium/High band. All
 * inputs are backend-computed; this only summarises them.
 */
export function networkPressure(links) {
  const list = links || []
  let load = 0
  let capacity = 0
  for (const l of list) {
    load += l.currentLoad || 0
    capacity += l.capacity || 0
  }
  const ratio = capacity > 0 ? Math.min(1, load / capacity) : 0
  return { ratio, band: pressureBand(ratio) }
}

/** Low/Medium/High band for a 0..1 pressure ratio. */
function pressureBand(ratio) {
  if (ratio >= 0.66) return 'HIGH'
  if (ratio >= 0.33) return 'MEDIUM'
  return 'LOW'
}
