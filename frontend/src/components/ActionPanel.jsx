import React, { useState } from 'react'
import { submitAction } from '../services/api'

export default function ActionPanel({ sessionId }) {
  const [sourceNode, setSourceNode] = useState('')
  const [targetNode, setTargetNode] = useState('')

  async function handleRoute() {
    await submitAction(sessionId, { type: 'ROUTE', sourceNode, targetNode })
  }

  return (
    <div>
      <h3>Actions</h3>
      <input placeholder="Source node" value={sourceNode} onChange={e => setSourceNode(e.target.value)} />
      <input placeholder="Target node" value={targetNode} onChange={e => setTargetNode(e.target.value)} />
      <button onClick={handleRoute}>Route Packet</button>
    </div>
  )
}
