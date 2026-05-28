import React, { useState } from 'react'

export default function ActionPanel({ sessionId, state, onStateUpdate }) {
    const [flowId, setFlowId] = useState('')
    const [pathInput, setPathInput] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const pendingFlows = (state?.flows ?? []).filter(f => f.status === 'PENDING')
    const selectedFlow = pendingFlows.find(f => String(f.id) === flowId)

    async function handleSubmit() {
        setError('')
        if (!flowId) { setError('Pick a flow first.'); return }
        const path = pathInput.split(/[\s,]+/).filter(Boolean).map(Number)
        if (path.some(Number.isNaN)) { setError('Path must be node IDs separated by spaces or commas.'); return }
        if (path.length < 2) { setError('Path needs at least two nodes (source and destination).'); return }

        setBusy(true)
        try {
            const res = await fetch(`/api/sessions/${sessionId}/actions/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flowId: Number(flowId), path }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
            onStateUpdate?.(data)        // swap in the returned state immediately
            setFlowId('')
            setPathInput('')
        } catch (e) {
            setError(e.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div style={{ marginTop: 12 }}>
            <h3>Actions</h3>
            {pendingFlows.length === 0 && <p>No pending flows.</p>}
            {pendingFlows.length > 0 && (
                <>
                    <label>
                        Flow:{' '}
                        <select value={flowId} onChange={e => setFlowId(e.target.value)}>
                            <option value="">— pick a flow —</option>
                            {pendingFlows.map(f => (
                                <option key={f.id} value={f.id}>
                                    #{f.id} {f.trafficType} {f.source} → {f.destination} (bw {f.bandwidth})
                                </option>
                            ))}
                        </select>
                    </label>
                    {selectedFlow && (
                        <p style={{ fontSize: 12, color: '#555' }}>
                            Path must start at {selectedFlow.source} and end at {selectedFlow.destination}.
                        </p>
                    )}
                    <div style={{ marginTop: 6 }}>
                        <input
                            placeholder="Path, e.g. 6 1 4"
                            value={pathInput}
                            onChange={e => setPathInput(e.target.value)}
                            style={{ width: 220 }}
                        />{' '}
                        <button onClick={handleSubmit} disabled={busy}>Route Flow</button>
                    </div>
                    {error && <p style={{ color: 'crimson' }}>{error}</p>}
                </>
            )}
        </div>
    )
}