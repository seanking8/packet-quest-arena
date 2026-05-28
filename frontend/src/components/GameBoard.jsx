import React from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'

// Pick an edge colour based on status and how loaded the link is.
function linkColor(link) {
  if (link.status === 'DOWN') return '#9ca3af'        // grey - down
  if (link.status === 'DEGRADED') return '#f59e0b'    // amber - degraded
  const ratio = link.capacity > 0 ? link.load / link.capacity : 0
  if (ratio >= 0.8) return '#dc2626'                  // red - heavily loaded
  if (ratio >= 0.5) return '#f59e0b'                  // amber - moderately loaded
  return '#16a34a'                                    // green - healthy
}

export default function GameBoard({ state }) {
  const nodes = (state?.nodes ?? []).map(n => ({
    id: String(n.id),
    data: { label: n.name },
    position: { x: n.x, y: n.y },
  }))

  const edges = (state?.links ?? []).map(l => ({
    id: String(l.id),
    source: String(l.source),
    target: String(l.target),
    label: `${l.load}/${l.capacity}`,
    style: { stroke: linkColor(l), strokeWidth: 2 },
    labelStyle: { fontSize: 11 },
  }))

  if (!state) {
    return <div style={{ padding: 16 }}>Loading network…</div>
  }

  return (
      <div style={{ height: 500, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
  )
}