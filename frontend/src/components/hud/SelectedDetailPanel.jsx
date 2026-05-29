export default function SelectedDetailPanel({ selected, onClear }) {
  if (!selected) {
    return (
      <section className="panel">
        <h3>Inspector</h3>
        <p className="muted">Click a node or link on the map to inspect it.</p>
      </section>
    )
  }

  const { kind, data } = selected
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{kind === 'node' ? 'Node' : 'Link'} details</h3>
        <button className="link-btn" onClick={onClear}>clear</button>
      </div>
      {kind === 'node' ? (
        <dl className="kv">
          <dt>Name</dt><dd>{data.label}</dd>
          <dt>Type</dt><dd>{data.type}</dd>
          <dt>Status</dt><dd>{data.status}</dd>
          <dt>Loss</dt><dd>{(data.packetLossRate ?? 0).toFixed(3)}</dd>
        </dl>
      ) : (
        <dl className="kv">
          <dt>Type</dt><dd>{data.linkType}</dd>
          <dt>Status</dt><dd>{data.status}</dd>
          <dt>Load</dt><dd>{Math.round(data.currentLoad)} / {Math.round(data.capacity)}</dd>
          <dt>Latency</dt><dd>{Math.round(data.currentLatencyMs)} ms</dd>
        </dl>
      )}
    </section>
  )
}
