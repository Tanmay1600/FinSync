import { useEffect } from 'react'
import { Mic, MicOff, Loader } from 'lucide-react'
import { useVoskSpeechRecognition } from '../hooks/useVoskSpeechRecognition'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function VoiceInput({ onTranscript, placeholder = 'Click mic to speak...', className = '', disabled = false }: VoiceInputProps) {
  const {
    isReady,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isLoading,
  } = useVoskSpeechRecognition()

  // Send transcript to parent when it changes
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript)
    }
  }, [transcript, onTranscript])

  const handleToggle = async () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      await startListening()
    }
  }

  const displayText = interimTranscript || transcript || placeholder

  return (
    <div className={`voice-input ${className}`}>
      <div className={`voice-input-display ${isListening ? 'listening' : ''}`}>
        <span className={transcript || interimTranscript ? 'has-text' : 'placeholder'}>
          {displayText}
        </span>
        {isListening && (
          <span className="voice-indicator">
            <span className="voice-dot"></span>
            <span className="voice-dot"></span>
            <span className="voice-dot"></span>
          </span>
        )}
      </div>
      
      <button
        type="button"
        className={`voice-btn ${isListening ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={disabled || isLoading || !isReady}
        title={isListening ? 'Stop recording' : isReady ? 'Start recording' : 'Loading model...'}
      >
        {isLoading ? (
          <Loader className="spin" size={20} />
        ) : isListening ? (
          <MicOff size={20} />
        ) : (
          <Mic size={20} />
        )}
      </button>
      
      {error && <div className="voice-error">{error}</div>}
      
      {!isReady && !isLoading && (
        <div className="voice-status">Speech recognition unavailable</div>
      )}
    </div>
  )
}

// Simple button-only version for integration into existing forms
interface VoiceButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  size?: number
}

export function VoiceButton({ onTranscript, disabled = false, size = 20 }: VoiceButtonProps) {
  const {
    isReady,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isLoading,
  } = useVoskSpeechRecognition()

  // Send transcript to parent when recording stops
  useEffect(() => {
    if (!isListening && transcript) {
      onTranscript(transcript)
      resetTranscript()
    }
  }, [isListening, transcript, onTranscript, resetTranscript])

  const handleToggle = async () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      await startListening()
    }
  }

  return (
    <button
      type="button"
      className={`voice-btn-inline ${isListening ? 'active' : ''} ${error ? 'error' : ''}`}
      onClick={handleToggle}
      disabled={disabled || isLoading || !isReady}
      title={
        error ? error :
        isListening ? 'Stop recording' : 
        isReady ? 'Voice input (offline)' : 
        'Loading speech model...'
      }
    >
      {isLoading ? (
        <Loader className="spin" size={size} />
      ) : isListening ? (
        <MicOff size={size} />
      ) : (
        <Mic size={size} />
      )}
    </button>
  )
}
