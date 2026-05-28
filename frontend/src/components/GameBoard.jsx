import React from 'react'
import ReactFlow from 'reactflow'
import 'reactflow/dist/style.css'

export default function GameBoard({ topology, flows }) {
  const nodes = (topology?.nodes ?? []).map(n => ({
    id: String(n.id),
    data: { label: n.name },
    position: { x: n.x, y: n.y },
  }))

  const edges = (topology?.links ?? []).map(l => ({
    id: `${l.source}-${l.target}`,
    source: String(l.source),
    target: String(l.target),
    label: `${l.load}/${l.capacity}`,
  }))

  return (
    <div style={{ height: 500 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView />
    </div>
  )
}
