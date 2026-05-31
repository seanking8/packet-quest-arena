import { useEffect, useState } from 'react'

/**
 * Returns the current epoch-ms, re-rendering on a fixed interval so live
 * countdowns tick smoothly between backend state polls. Used for display only;
 * the backend remains authoritative for deadlines and match end.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
