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
// Gain values can exceed 1.0 using Web Audio API GainNode.
const SFX_GAIN = 2.5

// Shared AudioContext is created once on first interaction.
let audioCtx = null
function getAudioContext() {
  if (!audioCtx) audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)()
  return audioCtx
}

// Cache decoded buffers so each file is only fetched + decoded once.
const bufferCache = {}
function getBuffer(src) {
  if (!bufferCache[src]) {
    bufferCache[src] = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((buf) => getAudioContext().decodeAudioData(buf))
  }
  return bufferCache[src]
}

/**
 * Play a sound via Web Audio API with a gain boost (allows volume > 1.0).
 */
function playWithGain(src, gain = SFX_GAIN) {
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
 *   play(name)          - play a one-shot SFX
 *   playMusic(name)     - start a looping background track (stops the current one)
 *   stopMusic()         - stop background music
 */
export default function useAudio() {
  const bgRef  = useRef(null)
  const bgName = useRef(null)

  const play = useCallback((name) => {
    const src = SOUNDS[name]
    if (src) playWithGain(src, SFX_GAIN)
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
    audio.volume = MUSIC_VOLUME
    const playResult = audio.play()
    if (playResult?.catch) playResult.catch(() => {})
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

  useEffect(() => () => stopMusic(), [stopMusic])

  return { play, playMusic, stopMusic }
}
