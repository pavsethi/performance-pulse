import { useCallback, useEffect, useRef, useState } from 'react'

/* The Web Speech API is not in the DOM lib types. */
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}

const getCtor = (): (new () => SpeechRecognitionLike) | null => {
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Live dictation via the browser's own speech engine — no server, no key.
 * Falls back gracefully; `supported` tells the UI whether to offer the mic.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const supported = typeof window !== 'undefined' && getCtor() !== null

  const stop = useCallback(() => {
    ref.current?.stop()
    ref.current = null
    setRecording(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('This browser has no speech engine. Type or paste instead.')
      return
    }
    setError(null)
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e: any) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) onFinalRef.current(chunk.trim() + ' ')
        else live += chunk
      }
      setInterim(live)
    }
    rec.onerror = (e: any) => {
      setError(
        e.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : `Speech error: ${e.error}`,
      )
      setRecording(false)
    }
    rec.onend = () => setRecording(false)

    ref.current = rec
    rec.start()
    setRecording(true)
  }, [])

  useEffect(() => () => ref.current?.stop(), [])

  return { recording, interim, error, supported, start, stop }
}
