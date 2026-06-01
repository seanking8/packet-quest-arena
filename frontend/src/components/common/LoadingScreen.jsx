const STEPS = [
  { label: 'Topology', value: 'mapped' },
  { label: '5G links', value: 'locked' },
  { label: 'Packets', value: 'queued' },
  { label: 'Telemetry', value: 'live' },
]

export default function LoadingScreen({ message = 'Loading session state.', error = null }) {
  const hasError = Boolean(error)
  const title = hasError ? 'Reconnecting route control' : 'Routing packet paths'
  const detail = hasError ? error : message

  return (
    <main className={`loading-screen ${hasError ? 'has-error' : ''}`} role="status" aria-live="polite">
      <div className="loading-grid" aria-hidden="true" />

      <div className="loading-shell">
        <section className="loading-visual" aria-hidden="true">
          <svg className="loading-network" viewBox="0 0 760 520">
            <defs>
              <linearGradient id="loading-link-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7affc4" />
                <stop offset="52%" stopColor="#4f8cff" />
                <stop offset="100%" stopColor="#ffb454" />
              </linearGradient>
              <filter id="loading-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g className="loading-city">
              <rect x="72" y="330" width="52" height="118" />
              <rect x="142" y="286" width="64" height="162" />
              <rect x="224" y="244" width="48" height="204" />
              <rect x="292" y="310" width="76" height="138" />
              <rect x="388" y="216" width="58" height="232" />
              <rect x="466" y="270" width="88" height="178" />
              <rect x="574" y="252" width="66" height="196" />
            </g>

            <g className="loading-radar">
              <circle cx="382" cy="248" r="78" />
              <circle cx="382" cy="248" r="126" />
              <circle cx="382" cy="248" r="174" />
            </g>

            <g className="loading-links">
              <path className="loading-link secondary" d="M118 336 L214 262 L334 298 L452 214 L610 252" />
              <path className="loading-link main" d="M122 382 L246 338 L382 248 L512 318 L646 286" />
              <path className="loading-link secondary delay-a" d="M214 262 L246 338 L330 404 L512 318" />
              <path className="loading-link secondary delay-b" d="M334 298 L382 248 L452 214 L646 286" />
            </g>

            <g className="loading-packets" filter="url(#loading-glow)">
              <circle className="loading-packet packet-a" r="7">
                <animateMotion dur="2.9s" repeatCount="indefinite" path="M122 382 L246 338 L382 248 L512 318 L646 286" />
              </circle>
              <circle className="loading-packet packet-b" r="5">
                <animateMotion dur="3.4s" begin="0.35s" repeatCount="indefinite" path="M118 336 L214 262 L334 298 L452 214 L610 252" />
              </circle>
              <circle className="loading-packet packet-c" r="5">
                <animateMotion dur="3.1s" begin="0.8s" repeatCount="indefinite" path="M214 262 L246 338 L330 404 L512 318" />
              </circle>
            </g>

            <g className="loading-nodes" filter="url(#loading-glow)">
              <circle className="node edge" cx="118" cy="336" r="12" />
              <circle className="node radio" cx="122" cy="382" r="10" />
              <circle className="node core" cx="214" cy="262" r="13" />
              <circle className="node edge" cx="246" cy="338" r="11" />
              <circle className="node radio" cx="330" cy="404" r="9" />
              <circle className="node core" cx="382" cy="248" r="18" />
              <circle className="node edge" cx="452" cy="214" r="11" />
              <circle className="node core" cx="512" cy="318" r="14" />
              <circle className="node radio" cx="610" cy="252" r="10" />
              <circle className="node edge" cx="646" cy="286" r="11" />
            </g>

            <g className="loading-node-labels">
              <text x="382" y="214">CORE</text>
              <text x="512" y="352">MEC</text>
              <text x="646" y="322">RAN</text>
            </g>
          </svg>
        </section>

        <section className="loading-copy">
          <span className="loading-kicker">Packet Quest Arena</span>
          <h1>{title}</h1>
          <p>{detail}</p>

          <div className="loading-progress" aria-hidden="true">
            <span />
          </div>

          <dl className="loading-steps">
            {STEPS.map((step) => (
              <div key={step.label}>
                <dt>{step.label}</dt>
                <dd>{step.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  )
}
