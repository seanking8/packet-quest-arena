import { useCallback, useEffect, useRef } from 'react'

const SOUNDS = {
  // Background music
  menuMusic:       '/audio/main-menu-loop.wav',
  cityMusic:       '/audio/city-background-loop.mp3',
  districtMusic:   '/audio/district-background-drone.mp3',
  // SFX
  buttonClick:     '/audio/button-click.mp3',
  hopValid:        '/audio/select-node-valid.mp3',
  hopInvalid:      '/audio/select-node-invalid.mp3',
  delivered:       '/audio/route-success.mp3',
  dropped:         '/audio/packet-dropped.mp3',
  aboutToExpire:   '/audio/packet-about-to-expire.mp3',
  incident:        '/audio/incident.mp3',
}

const MUSIC_VOLUME = 0.35
const MUSIC_VOLUME_OVERRIDE = {
  districtMusic: 0.7,
}

const SFX_GAIN = 2.5
const SFX_GAIN_OVERRIDE = {
  aboutToExpire: 0.25,  // significantly quieter
}

// --- Module-level mute state (shared across all hook instances) ---
let muted = false
const muteListeners = new Set()

export function isMuted() { return muted }

export function toggleMute() {
  muted = !muted
  muteListeners.forEach((fn) => fn(muted))
  return muted
}

// --- Web Audio API ---
let audioCtx = null
function getAudioContext() {
  if (!audioCtx) audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)()
  return audioCtx
}

const bufferCache = {}
function getBuffer(src) {
  if (!bufferCache[src]) {
    bufferCache[src] = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((buf) => getAudioContext().decodeAudioData(buf))
  }
  return bufferCache[src]
}

function playWithGain(src, gain) {
  if (muted) return
  getBuffer(src).then((decoded) => {
    const ctx = getAudioContext()
    const source = ctx.createBufferSource()
    source.buffer = decoded
    const gainNode = ctx.createGain()
    gainNode.gain.value = gain
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(0)
  }).catch(() => {})
}

/**
 * Central audio hook. Returns:
 *   play(name)      — one-shot SFX
 *   playMusic(name) — looping background track
 *   stopMusic()     — stop background music
 */
export default function useAudio() {
  const bgRef  = useRef(null)
  const bgName = useRef(null)

  const play = useCallback((name) => {
    const src = SOUNDS[name]
    if (src) playWithGain(src, SFX_GAIN_OVERRIDE[name] ?? SFX_GAIN)
  }, [])

  const playMusic = useCallback((name) => {
    if (bgName.current === name && bgRef.current && !bgRef.current.paused) return
    if (bgRef.current) {
      bgRef.current.pause()
      bgRef.current.currentTime = 0
    }
    const src = SOUNDS[name]
    if (!src) return
    const audio = new Audio(src)
    audio.loop   = true
    audio.volume = muted ? 0 : (MUSIC_VOLUME_OVERRIDE[name] ?? MUSIC_VOLUME)
    audio.play().catch(() => {})
    bgRef.current  = audio
    bgName.current = name
  }, [])

  const stopMusic = useCallback(() => {
    if (bgRef.current) {
      bgRef.current.pause()
      bgRef.current.currentTime = 0
    }
    bgRef.current  = null
    bgName.current = null
  }, [])

  // Respond to mute toggle — silence or restore the current music track.
  useEffect(() => {
    const handler = (nowMuted) => {
      if (!bgRef.current) return
      if (nowMuted) {
        bgRef.current.volume = 0
      } else {
        bgRef.current.volume = MUSIC_VOLUME_OVERRIDE[bgName.current] ?? MUSIC_VOLUME
        // Resume if the browser paused the element when volume hit 0
        if (bgRef.current.paused) bgRef.current.play().catch(() => {})
      }
    }
    muteListeners.add(handler)
    return () => muteListeners.delete(handler)
  }, [])

  useEffect(() => () => stopMusic(), [stopMusic])

  return { play, playMusic, stopMusic }
}
