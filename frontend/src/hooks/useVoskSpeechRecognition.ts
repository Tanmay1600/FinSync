import { useState, useCallback, useRef, useEffect } from 'react'
import { createModel, type KaldiRecognizer, type Model } from 'vosk-browser'

// Vosk model configuration - must be a .tar.gz file
const MODEL_PATH = '/models/vosk-model-small-en-us-0.15.tar.gz'

interface UseVoskSpeechRecognitionReturn {
  isReady: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => Promise<void>
  stopListening: () => void
  resetTranscript: () => void
  isLoading: boolean
}

// Singleton model instance to avoid reloading
let modelInstance: Model | null = null
let modelLoadingPromise: Promise<Model> | null = null

async function getModel(): Promise<Model> {
  if (modelInstance) {
    return modelInstance
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise
  }

  console.log('[Vosk] Loading model from:', MODEL_PATH)
  
  modelLoadingPromise = createModel(MODEL_PATH)
    .then(model => {
      console.log('[Vosk] Model loaded successfully')
      modelInstance = model
      return model
    })
    .catch(err => {
      console.error('[Vosk] Model loading failed:', err)
      modelLoadingPromise = null
      throw err
    })

  return modelLoadingPromise
}

export function useVoskSpeechRecognition(): UseVoskSpeechRecognitionReturn {
  const [isReady, setIsReady] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const modelRef = useRef<Model | null>(null)
  const recognizerRef = useRef<KaldiRecognizer | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Initialize model on mount
  useEffect(() => {
    let mounted = true

    const init = async () => {
      setIsLoading(true)
      try {
        const model = await getModel()
        if (mounted) {
          modelRef.current = model
          setIsReady(true)
          setError(null)
          console.log('[Vosk] Ready for speech recognition')
        }
      } catch (err) {
        if (mounted) {
          const errMsg = err instanceof Error ? err.message : 'Failed to load speech recognition model'
          setError(errMsg)
          console.error('[Vosk] Initialization error:', err)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  const startListening = useCallback(async () => {
    if (!isReady || !modelRef.current || isListening) {
      console.log('[Vosk] Cannot start - isReady:', isReady, 'hasModel:', !!modelRef.current, 'isListening:', isListening)
      return
    }

    try {
      setError(null)
      console.log('[Vosk] Starting speech recognition...')
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      mediaStreamRef.current = stream
      console.log('[Vosk] Microphone access granted')

      // Create recognizer with 16000 sample rate
      const recognizer = new modelRef.current.KaldiRecognizer(16000)
      recognizer.setWords(true)
      recognizerRef.current = recognizer
      console.log('[Vosk] Recognizer created')

      // Set up result handlers
      recognizer.on('result', (message: { result: { text?: string } }) => {
        console.log('[Vosk] Result:', message)
        const text = message.result?.text
        if (text && text.trim()) {
          setTranscript(prev => {
            const newText = prev ? `${prev} ${text}` : text
            return newText.trim()
          })
          setInterimTranscript('')
        }
      })

      recognizer.on('partialresult', (message: { result: { partial?: string } }) => {
        console.log('[Vosk] Partial:', message)
        const partial = message.result?.partial
        if (partial) {
          setInterimTranscript(partial)
        }
      })

      // Create audio context - browser will use its native sample rate
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      
      // Resume if suspended (needed for some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      const actualSampleRate = audioContext.sampleRate
      console.log('[Vosk] AudioContext sample rate:', actualSampleRate)
      
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source
      
      // Use ScriptProcessor for audio processing
      const bufferSize = 4096
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (recognizerRef.current) {
          // Pass the AudioBuffer directly - vosk-browser expects it with getChannelData method
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognizerRef.current.acceptWaveform(e.inputBuffer as any)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsListening(true)
      console.log('[Vosk] Now listening...')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start microphone'
      setError(errorMessage)
      console.error('[Vosk] Speech recognition error:', err)
    }
  }, [isReady, isListening])

  const stopListening = useCallback(() => {
    if (!isListening) return

    console.log('[Vosk] Stopping...')

    // Disconnect source first
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Clean up recognizer
    if (recognizerRef.current) {
      recognizerRef.current.remove()
      recognizerRef.current = null
    }

    setIsListening(false)
    setInterimTranscript('')
    console.log('[Vosk] Stopped')
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (recognizerRef.current) {
        recognizerRef.current.remove()
      }
    }
  }, [])

  return {
    isReady,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isLoading,
  }
}
