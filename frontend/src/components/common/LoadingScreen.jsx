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
          <path className="route-line route-line-a" pathLength="1" d="M188 292 L294 236 L414 259 L528 204 L650 236 L768 183" />
          <path className="route-line route-line-b" pathLength="1" d="M230 350 L340 305 L486 330 L615 292 L740 342" />
          <path className="route-line route-line-c" pathLength="1" d="M348 186 L414 259 L486 330 L610 388 L792 378" />
          <path className="route-line route-line-d" pathLength="1" d="M132 224 L294 236 L340 305 L528 204 L615 292" />
        </g>

        <g className="loading-route-nodes" filter="url(#node-glow)">
          <circle cx="132" cy="224" r="7" />
          <circle cx="188" cy="292" r="8" />
          <circle cx="230" cy="350" r="7" />
          <circle cx="294" cy="236" r="9" />
          <circle cx="340" cy="305" r="8" />
          <circle cx="348" cy="186" r="7" />
          <circle cx="414" cy="259" r="10" />
          <circle cx="486" cy="330" r="8" />
          <circle cx="528" cy="204" r="9" />
          <circle cx="610" cy="388" r="7" />
          <circle cx="615" cy="292" r="9" />
          <circle cx="650" cy="236" r="8" />
          <circle cx="740" cy="342" r="7" />
          <circle cx="768" cy="183" r="8" />
          <circle cx="792" cy="378" r="7" />
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
