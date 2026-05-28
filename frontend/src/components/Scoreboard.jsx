import React from 'react'

export default function Scoreboard({ score }) {
    return (
        <div style={{ marginTop: 12 }}>
            <h3>Score</h3>
            <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>{score ?? 0}</p>
        </div>
    )
}