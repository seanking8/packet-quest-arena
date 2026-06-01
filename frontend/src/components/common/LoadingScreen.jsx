export default function LoadingScreen({ message = 'Loading session state.', error = null }) {
  const hasError = Boolean(error)
  const status = hasError ? error : message

  return (
    <main
      className={`loading-screen ${hasError ? 'has-error' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={status}
    >
      <svg className="loading-map-overlay" viewBox="0 0 1000 562" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="loading-route-lines">
          <path className="route-line route-line-a" pathLength="1" d="M154 205 L223 176 L294 90 L362 140 L445 188 L541 258" />
          <path className="route-line route-line-b" pathLength="1" d="M225 250 L309 219 L422 250 L486 220 L615 354 L664 401" />
          <path className="route-line route-line-c" pathLength="1" d="M246 149 L294 90 L360 181 L445 188 L542 358 L779 421" />
          <path className="route-line route-line-d" pathLength="1" d="M541 258 L611 233 L752 238 L774 284 L664 401" />
        </g>

        <g className="loading-route-nodes" filter="url(#node-glow)">
          <circle cx="154" cy="205" r="6" />
          <circle cx="223" cy="176" r="7" />
          <circle cx="225" cy="250" r="6" />
          <circle cx="246" cy="149" r="7" />
          <circle cx="294" cy="90" r="8" />
          <circle cx="309" cy="219" r="6" />
          <circle cx="360" cy="181" r="7" />
          <circle cx="362" cy="140" r="7" />
          <circle cx="422" cy="250" r="6" />
          <circle cx="445" cy="188" r="8" />
          <circle cx="486" cy="220" r="6" />
          <circle cx="541" cy="258" r="7" />
          <circle cx="542" cy="358" r="7" />
          <circle cx="611" cy="233" r="6" />
          <circle cx="615" cy="354" r="7" />
          <circle cx="664" cy="401" r="7" />
          <circle cx="752" cy="238" r="7" />
          <circle cx="774" cy="284" r="6" />
          <circle cx="779" cy="421" r="7" />
        </g>
      </svg>

      <section className="loading-center">
        <h1 className="loading-title" data-text="Packet Quest Arena">Packet Quest Arena</h1>
        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  )
}
