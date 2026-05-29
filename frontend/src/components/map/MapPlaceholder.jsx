/**
 * Placeholder for the 3D network map (replaced by the React Three Fiber scene
 * in the next section). Shows the live counts so the screen isn't empty.
 */
export default function MapPlaceholder({ state }) {
  return (
    <div className="map-placeholder">
      <div className="map-placeholder-inner">
        <h2>3D Network Map will render here</h2>
        <p className="muted">
          {state.nodes?.length ?? 0} nodes · {state.links?.length ?? 0} links ·{' '}
          {state.mapObjects?.length ?? 0} buildings
        </p>
      </div>
    </div>
  )
}
