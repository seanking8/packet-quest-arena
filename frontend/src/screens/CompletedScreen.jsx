import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import { rankedPlayers, leaderOf } from '../lib/format'
import { getMatchReport, getPersistentLeaderboard } from '../services/api'

export default function CompletedScreen({ state }) {
  const { leave, playerId } = useGame()
  const ranked = rankedPlayers(state.players)
  const winner = leaderOf(state.players)
  const [report, setReport] = useState(null)
  const [reportError, setReportError] = useState(null)
  const [difficultyLeaderboard, setDifficultyLeaderboard] = useState(null)
  const [leaderboardError, setLeaderboardError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setReport(null)
    setReportError(null)
    setDifficultyLeaderboard(null)
    setLeaderboardError(null)
    Promise.all([
      getMatchReport(state.sessionId),
      getPersistentLeaderboard(state.difficulty || 'MEDIUM'),
    ])
      .then(([reportData, leaderboardData]) => {
        if (!cancelled) {
          setReport(reportData)
          setDifficultyLeaderboard(leaderboardData || [])
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setReportError(e.message)
          setLeaderboardError(e.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [state.sessionId, state.difficulty])

  return (
    <div className="screen center pregame-screen completed-screen">
      <div className="lobby">
        <header className="home-header">
          <h1>Match complete</h1>
          {winner && (
            <p className="muted">
              Winner: <strong style={{ color: winner.color }}>{winner.displayName}</strong> with{' '}
              {winner.score} pts
            </p>
          )}
        </header>

        <section className="card">
          <h2>Final scores</h2>
          <ol className="leaderboard">
            {ranked.map((p, i) => (
              <li key={p.id} className={i === 0 ? 'top-score' : ''}>
                <span className="rank">{i + 1}</span>
                <span className="dot" style={{ background: p.color }} />
                <span className="grow">
                  {p.displayName}{p.id === playerId && ' (you)'}
                  <span className="pkt-counts">
                    <span className="pkt-ok" title="delivered">OK {p.deliveredPackets ?? 0} delivered</span>
                    <span className="pkt-bad" title="dropped">DROP {p.droppedPackets ?? 0} dropped</span>
                  </span>
                </span>
                <span className="score">{p.score}</span>
              </li>
            ))}
          </ol>
        </section>

        <DatabaseReportCard report={report} error={reportError} />

        <DifficultyLeaderboardCard
          difficulty={state.difficulty}
          leaderboard={difficultyLeaderboard}
          error={leaderboardError}
        />

        <div className="row">
          <button onClick={leave}>Play again</button>
        </div>
      </div>
    </div>
  )
}

function DifficultyLeaderboardCard({ difficulty, leaderboard, error }) {
  const title = `${formatDifficulty(difficulty)} leaderboard`

  if (error) {
    return (
      <section className="card compact-card report-card">
        <h2>{title}</h2>
        <p className="muted">Saved leaderboard is unavailable right now.</p>
      </section>
    )
  }

  if (!leaderboard) {
    return (
      <section className="card compact-card report-card">
        <h2>{title}</h2>
        <p className="muted">Loading saved leaderboard.</p>
      </section>
    )
  }

  return (
    <section className="card compact-card report-card">
      <h2>{title}</h2>
      {leaderboard.length === 0 ? (
        <p className="muted">This is the first completed {formatDifficulty(difficulty).toLowerCase()} match saved in MySQL.</p>
      ) : (
        <ol className="insight-list">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <li key={entry.playerName} className="insight-row">
              <span className="rank">{index + 1}</span>
              <span className="grow">
                {entry.playerName}
                <span className="match-meta">
                  {entry.matches} matches - {entry.wins} wins - best {entry.bestScore} pts
                </span>
              </span>
              <span className="score">{entry.totalScore} pts</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function DatabaseReportCard({ report, error }) {
  if (error) {
    return (
      <section className="card report-card">
        <h2>Database report</h2>
        <p className="muted">Saved report is unavailable right now.</p>
      </section>
    )
  }

  if (!report) {
    return (
      <section className="card report-card">
        <h2>Database report</h2>
        <p className="muted">Loading saved match report.</p>
      </section>
    )
  }

  const timeline = (report.timeline || []).slice(-8)

  return (
    <section className="card report-card">
      <h2>Database report</h2>
      <p className="muted">{report.highlight}</p>

      <div className="report-grid">
        <ReportMetric label="Routes" value={report.routeActions} />
        <ReportMetric label="Incidents" value={report.incidentEvents} />
        <ReportMetric label="Delivered" value={report.deliveredPackets} />
        <ReportMetric label="Dropped" value={report.droppedPackets} />
        <ReportMetric label="Avg latency" value={`${Math.round(report.averageLatencyMs || 0)} ms`} />
        <ReportMetric label="Saved total" value={`${report.totalScore} pts`} />
      </div>

      <h3 className="timeline-title">Replay timeline</h3>
      {timeline.length === 0 ? (
        <p className="muted">No route or incident events were stored for this match.</p>
      ) : (
        <ol className="timeline-list">
          {timeline.map((event, index) => (
            <li key={`${event.type}-${event.subjectId}-${event.at}-${index}`} className="timeline-row">
              <span className="timeline-time">{formatTimelineTime(event.at)}</span>
              <span className="grow">{event.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ReportMetric({ label, value }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatTimelineTime(value) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function formatDifficulty(value) {
  const text = String(value || 'MEDIUM').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
