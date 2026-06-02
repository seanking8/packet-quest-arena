import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { GameProvider } from './state/GameContext'
import './styles/global.css'

// Global button-click SFX — fires for every <button> click without per-component wiring.
let _audioCtx = null
let _clickBuffer = null
function getClickBuffer() {
  if (!_audioCtx) _audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)()
  if (!_clickBuffer) {
    _clickBuffer = fetch('/audio/button-click.mp3')
      .then((r) => r.arrayBuffer())
      .then((buf) => _audioCtx.decodeAudioData(buf))
  }
  return _clickBuffer
}
function playButtonClick() {
  getClickBuffer().then((decoded) => {
    const src = _audioCtx.createBufferSource()
    src.buffer = decoded
    const gain = _audioCtx.createGain()
    gain.gain.value = 3
    src.connect(gain)
    gain.connect(_audioCtx.destination)
    src.start(0)
  }).catch(() => {})
}
document.addEventListener('click', (e) => {
  if (e.target.closest('button')) playButtonClick()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>
)
