import { type FormEvent, useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { ScanLine, Mic, FileText, Plus, Camera, Loader, MicOff } from 'lucide-react'
import { useVoskSpeechRecognition } from '../hooks/useVoskSpeechRecognition'
import { db } from '../lib/db'

type TagColor = 'red' | 'yellow' | 'green' | 'grey'

interface TagOption {
  id: number
  label: string
  color: TagColor
}

const TAG_OPTIONS: TagOption[] = [
  { id: 1, label: 'High Intent', color: 'red' },
  { id: 2, label: 'Interested', color: 'red' },
  { id: 3, label: 'Follow-up Needed', color: 'red' },
  { id: 4, label: 'Call Tomorrow', color: 'red' },
  { id: 5, label: 'Meeting Requested', color: 'red' },
  { id: 6, label: 'Referred Lead', color: 'red' },
  { id: 7, label: 'Exploring Options', color: 'yellow' },
  { id: 8, label: 'Met at Stall', color: 'yellow' },
  { id: 9, label: 'Networking Floor', color: 'yellow' },
  { id: 10, label: 'Business Owner', color: 'yellow' },
  { id: 11, label: 'HNI Client', color: 'green' },
  { id: 12, label: 'Wealth Management', color: 'green' },
  { id: 13, label: 'Tax Planning', color: 'green' },
  { id: 14, label: 'Mutual Funds', color: 'green' },
  { id: 15, label: 'Not Relevant', color: 'grey' },
]

type CaptureMode = 'scan' | 'audio' | 'text' | null
type ViewState = 'initial' | 'mode-selection' | 'form'

export function FieldCapture() {
  const [viewState, setViewState] = useState<ViewState>('initial')
  const [mode, setMode] = useState<CaptureMode>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tags, setTags] = useState<string[]>([])
    const [tagIds, setTagIds] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Camera/Audio state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [audioNoteId, setAudioNoteId] = useState<number | null>(null)

  // Vosk speech recognition
  const {
    isReady: isVoskReady,
    isListening: isVoskListening,
    transcript: voskTranscript,
    interimTranscript: voskInterim,
    error: voskError,
    startListening: startVoskListening,
    stopListening: stopVoskListening,
    resetTranscript: resetVoskTranscript,
    isLoading: isVoskLoading,
  } = useVoskSpeechRecognition()

  const { addLead, appendHistory } = useApp()

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Camera access denied. Please enable camera permissions.')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }

  const handleCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      setCapturedImage(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startAudioRecording = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
          setAudioBlob(blob)
          const createdAt = Date.now()
          const id = await db.audioNotes.add({
            blob,
            mimeType: blob.type || 'audio/webm',
            createdAt,
          })
          setAudioNoteId(id)
        } catch (dbError) {
          console.error('Error saving audio note to IndexedDB:', dbError)
          alert('Failed to save audio note. Please try again.')
        }
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      recordingIntervalRef.current = interval
    } catch (error) {
      console.error('Error starting audio recording:', error)
      alert('Unable to access microphone for audio recording.')
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    const intervalRef = recordingIntervalRef.current
    return () => {
      stopCamera()
      if (intervalRef) {
        clearInterval(intervalRef)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  // Start camera when scan mode is selected
  useEffect(() => {
    if (mode === 'scan' && viewState === 'form') {
      startCamera()
    }
    return () => {
      if (mode !== 'scan') {
        stopCamera()
      }
    }
  }, [mode, viewState])

  const toggleTag = (tag: TagOption) => {
    setTags((prev) =>
      prev.includes(tag.label)
        ? prev.filter((t) => t !== tag.label)
        : [...prev, tag.label],
    )
    setTagIds((prev) =>
      prev.includes(tag.id)
        ? prev.filter((id) => id !== tag.id)
        : [...prev, tag.id],
    )
  }

  const handleSaveLead = async () => {
    // Validation: tags required
    if (tags.length === 0) {
      alert('Please select at least one tag before saving.')
      return
    }

    // Validation: require either visiting card image OR all primary fields
    const hasVisitingCard = Boolean(capturedImage)
    const hasPrimaryFields = Boolean(name.trim() && email.trim() && phone.trim())
    if (!hasVisitingCard && !hasPrimaryFields) {
      alert('Add a visiting card image or fill name, email, and mobile number.')
      return
    }

    setSaving(true)
    const leadId = await addLead({
      name: name.trim() || 'Visitor',
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim(),
      interest: note.trim() || undefined,
      audioTranscript: voskTranscript?.trim() || undefined,
      audioNoteId: audioNoteId ?? undefined,
      visitingCardImage: capturedImage || undefined,
      tagIds,
      tags,
      source: 'field',
      stage: 'met',
    })
    if (leadId && (voskTranscript || audioNoteId !== null)) {
      const timestamp = Date.now()
      await appendHistory(leadId, {
        type: 'voice-note',
        timestamp,
        payload: {
          transcript: voskTranscript || undefined,
          audioBlobRef: audioNoteId !== null ? String(audioNoteId) : undefined,
        },
      })
    }
    setSaving(false)
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setTags([])
    setNote('')
    setMode(null)
    setViewState('initial')
    stopCamera()
    if (isRecording) {
      stopAudioRecording()
    }
  }

  const resetForm = () => {
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setTags([])
    setNote('')
    setMode(null)
    setViewState('initial')
    stopCamera()
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
    }
  }

  const handleModeSelect = (selectedMode: CaptureMode) => {
    setMode(selectedMode)
    setViewState('form')
  }

  // Show initial view with + button
  if (viewState === 'initial') {
    return (
      <section className="panel">
        <h2>Field – On-floor Capture</h2>
        <p className="muted">
          Capture lead information while on the conference floor
        </p>
        <div className="create-capture-container">
          <button 
            type="button" 
            className="create-capture-btn"
            onClick={() => {
              setMode('text')
              setViewState('form')
            }}
          >
            <Plus className="create-icon" />
            <span className="create-title">Create New Lead</span>
            <span className="create-desc">Start capturing visitor information</span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="mode-header">
        <button type="button" className="back-btn" onClick={resetForm}>
          ← Back
        </button>
        <div>
          <h2>
            {mode === 'scan' && 'Scan Visiting Card'}
            {mode === 'audio' && 'Record Audio Notes'}
            {mode === 'text' && 'Add Textual Notes'}
          </h2>
          <p className="muted">
            {mode === 'scan' && 'Use camera to capture and scan business cards'}
            {mode === 'audio' && 'Record conversation details and key points'}
            {mode === 'text' && 'Enter lead details manually'}
          </p>
          <div className="mode-switch">
            <button
              type="button"
              className={mode === 'scan' ? 'mode-switch-btn active' : 'mode-switch-btn'}
              onClick={() => setMode('scan')}
            >
              Scan
            </button>
            <button
              type="button"
              className={mode === 'audio' ? 'mode-switch-btn active' : 'mode-switch-btn'}
              onClick={() => setMode('audio')}
            >
              Audio
            </button>
            <button
              type="button"
              className={mode === 'text' ? 'mode-switch-btn active' : 'mode-switch-btn'}
              onClick={() => setMode('text')}
            >
              Text
            </button>
          </div>
        </div>
      </div>

      {mode === 'scan' && (
        <div className="scan-interface">
          <div className="camera-container">
            {!capturedImage ? (
              <>
                <div className="camera-viewfinder">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="camera-video"
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className="scan-frame"></div>
                  {!isCameraActive && !capturedImage && (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md">
                      <button type="button" onClick={startCamera} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                        <Camera size={20} />
                        Start Camera
                      </button>
                      <span className="my-2 text-gray-500">or</span>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:underline">
                        Upload an image
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleCardUpload} accept="image/*" className="hidden" />
                    </div>
                  )}
                </div>
                <p>Position visiting card within frame and capture</p>
                <div className="capture-tips">
                  <div className="tip-item">💡 Ensure good lighting</div>
                  <div className="tip-item">📐 Keep card flat and straight</div>
                  <div className="tip-item">🔍 Fill the frame with the card</div>
                </div>
                <div className="scan-controls">
                  <button 
                    className="capture-photo-btn"
                    onClick={capturePhoto}
                    disabled={!isCameraActive}
                  >
                    <Camera className="w-6 h-6" />
                    Capture Card
                  </button>
                  
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setMode('text')}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="captured-image-container">
                  <img src={capturedImage} alt="Captured card" className="captured-image" />
                  
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null)
                      startCamera()
                    }}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  >
                    Retake
                  </button>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveLead}
                    disabled={saving}
                    className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {saving ? (
                      <>
                        Saving...
                      </>
                    ) : (
                      'Save Lead'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'audio' && (
        <div className="audio-interface">
          <div className="audio-recorder">
            {/* Vosk Status */}
            <div className="vosk-status">
              {isVoskLoading && (
                <span className="vosk-loading">
                  <Loader className="spin" size={16} />
                  Loading speech model (offline)...
                </span>
              )}
              {isVoskReady && !isVoskLoading && (
                <span className="vosk-ready">✓ Offline speech recognition ready</span>
              )}
              {voskError && (
                <span className="vosk-error">⚠ {voskError}</span>
              )}
            </div>

            <div className="recording-visualizer">
              <Mic className={`mic-icon-large ${isVoskListening || isRecording ? 'recording' : ''}`} />
              <div className={`audio-waves ${isVoskListening || isRecording ? 'active' : ''}`}>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
            
            <p className="recording-status">
              {isVoskListening ? 'Listening & Transcribing...' :
               isRecording ? `Recording: ${formatTime(recordingTime)}` : 
               audioBlob ? 'Recording completed' : 'Ready to record'}
            </p>

            {/* Transcription Display */}
            <div className="transcription-box">
              <label>Transcription (Offline Speech-to-Text)</label>
              <div className="transcription-content">
                {voskTranscript && <span className="final-text">{voskTranscript}</span>}
                {voskInterim && <span className="interim-text">{voskInterim}</span>}
                {!voskTranscript && !voskInterim && (
                  <span className="placeholder-text">Click "Start Transcription" to begin...</span>
                )}
              </div>
            </div>

            <div className="recording-controls">
              {/* Vosk Transcription Controls */}
              {!isVoskListening && (
                <button 
                  className="record-btn" 
                  onClick={async () => {
                    resetVoskTranscript()
                    await startVoskListening()
                    await startAudioRecording()
                  }}
                  disabled={!isVoskReady || isVoskLoading}
                >
                  <Mic className="w-6 h-6" />
                  Start Transcription
                </button>
              )}
              {isVoskListening && (
                <button
                  className="stop-btn"
                  onClick={() => {
                    stopVoskListening()
                    stopAudioRecording()
                  }}
                >
                  <MicOff className="w-6 h-6" />
                  Stop Transcription
                </button>
              )}
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  stopVoskListening()
                  stopAudioRecording()
                  setMode('text')
                }}
              >
                Done
              </button>
              <button
                className="primary"
                type="button"
                disabled={saving}
                onClick={handleSaveLead}
              >
                {saving ? 'Saving…' : 'Save lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'text' && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); handleSaveLead() }}>
          <label>
            Name*
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Company
            <input value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <div className="form-row two">
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <div className="chips">
            {TAG_OPTIONS.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className={`chip chip-${tag.color}${tags.includes(tag.label) ? ' active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <label>
            Quick note about conversation
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
          <div className="form-row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save lead'}
            </button>
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// Fallback lightweight extractors for email/phone/name when primary parsing misses
const extractFallbackFields = (text: string): ParsedBusinessCard => {
  const result: ParsedBusinessCard = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Email
  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase()
  }

  // Phone: pick the first 10-13 digit sequence
  const digitRuns = text.match(/[+]?\d[\d\s().-]{7,}/g) || []
  const cleaned = digitRuns
    .map(run => run.replace(/\D/g, ''))
    .filter(d => d.length >= 10 && d.length <= 13)
  if (cleaned.length) {
    result.phone = cleaned[0]
  }

  // Name: choose the first line with 2-4 words, mostly letters
  for (const line of lines) {
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z\s.'-]+$/.test(line)) {
      result.name = line
      break
    }
  }

  return result
}
