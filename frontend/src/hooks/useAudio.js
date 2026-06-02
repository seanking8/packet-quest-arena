import { useCallback, useEffect, useRef } from 'react'

const SOUNDS = {
  // Background music
  menuMusic:       '/audio/main-menu-loop.wav',
  cityMusic:       '/audio/city-background-loop.mp3',
  districtMusic:   '/audio/district-background-drone.mp3',
  // SFX
  hopValid:        '/audio/select-node-valid.mp3',
  hopInvalid:      '/audio/select-node-invalid.mp3',
  delivered:       '/audio/route-success.mp3',
  dropped:         '/audio/packet-dropped.mp3',
  aboutToExpire:   '/audio/packet-about-to-expire.mp3',
  incident:        '/audio/incident.mp3',
}

const MUSIC_VOLUME = 0.35
const SFX_VOLUME   = 0.7

/**
 * Central audio hook. Returns:
 *   play(name)          — play a one-shot SFX
 *   playMusic(name)     — start a looping background track (stops the current one)
 *   stopMusic()         — stop background music
 */
export default function useAudio() {
  const bgRef    = useRef(null)  // current background Audio element
  const bgName   = useRef(null)  // name of playing track (avoid restarting same)

  // Preload all sounds up-front so first plays aren't delayed.
  const buffers = useRef({})
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([name, src]) => {
      const audio = new Audio(src)
      audio.preload = 'auto'
      buffers.current[name] = audio
    })
  }, [])

  const play = useCallback((name) => {
    const src = SOUNDS[name]
    if (!src) return
    // Clone so rapid successive plays don't cut each other off.
    const audio = new Audio(src)
    audio.volume = SFX_VOLUME
    audio.play().catch(() => { /* autoplay policy — ignore */ })
  }, [])

  const playMusic = useCallback((name) => {
    if (bgName.current === name && bgRef.current && !bgRef.current.paused) return
    // Stop previous track
    if (bgRef.current) {
      bgRef.current.pause()
      bgRef.current.currentTime = 0
    }
    const src = SOUNDS[name]
    if (!src) return
    const audio = new Audio(src)
    audio.loop   = true
    audio.volume = MUSIC_VOLUME
    audio.play().catch(() => { /* autoplay policy — ignore */ })
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

  // Clean up on unmount
  useEffect(() => () => stopMusic(), [stopMusic])

  return { play, playMusic, stopMusic }
}
