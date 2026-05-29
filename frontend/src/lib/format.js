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
