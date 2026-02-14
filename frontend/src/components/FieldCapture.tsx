import { type FormEvent, useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { ScanLine, Mic, FileText, Plus, Camera, Square, Play } from 'lucide-react'

const TAG_OPTIONS = ['HNI', 'PMS', 'Channel partner', 'ESOP', 'Treasury']

type CaptureMode = 'scan' | 'audio' | 'text' | null
type ViewState = 'initial' | 'mode-selection' | 'form'

export function FieldCapture() {
  const { addLead } = useApp()
  const [viewState, setViewState] = useState<ViewState>('initial')
  const [mode, setMode] = useState<CaptureMode>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Camera/Audio state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }

  // Audio functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Microphone access denied. Please enable microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
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

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await addLead({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      interest: note.trim() || undefined,
      tags,
      source: 'field',
      stage: 'met',
    })
    setSaving(false)
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setTags([])
    setNote('')
    setMode(null)
    setViewState('initial')
    setCapturedImage(null)
    setAudioBlob(null)
    setIsRecording(false)
    setRecordingTime(0)
    stopCamera()
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
    setCapturedImage(null)
    setAudioBlob(null)
    setIsRecording(false)
    setRecordingTime(0)
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
            onClick={() => setViewState('mode-selection')}
          >
            <Plus className="create-icon" />
            <span className="create-title">Create New Lead</span>
            <span className="create-desc">Start capturing visitor information</span>
          </button>
        </div>
      </section>
    )
  }

  // Show mode selection screen
  if (viewState === 'mode-selection') {
    return (
      <section className="panel">
        <h2>Field – On-floor Capture</h2>
        <p className="muted">
          Choose how you'd like to capture lead information
        </p>
        <div className="capture-modes">
          <button 
            type="button" 
            className="capture-mode-btn"
            onClick={() => handleModeSelect('scan')}
          >
            <ScanLine className="mode-icon" />
            <span className="mode-title">Scan Visiting Card</span>
            <span className="mode-desc">Capture card details instantly</span>
          </button>
          
          <button 
            type="button" 
            className="capture-mode-btn"
            onClick={() => handleModeSelect('audio')}
          >
            <Mic className="mode-icon" />
            <span className="mode-title">Record Audio</span>
            <span className="mode-desc">Voice notes and conversation</span>
          </button>
          
          <button 
            type="button" 
            className="capture-mode-btn"
            onClick={() => handleModeSelect('text')}
          >
            <FileText className="mode-icon" />
            <span className="mode-title">Add Textual Notes</span>
            <span className="mode-desc">Manual text entry</span>
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
            {mode === 'scan' && 'Position the visiting card in good lighting and capture'}
            {mode === 'audio' && 'Record conversation details and key points'}
            {mode === 'text' && 'Enter lead details manually'}
          </p>
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
                  {!isCameraActive && (
                    <div className="camera-overlay">
                      <Camera className="scan-icon-large" />
                      <p>Starting camera...</p>
                    </div>
                  )}
                </div>
                <p>Position visiting card within frame and capture</p>
                <div className="scan-controls">
                  <button 
                    className="capture-photo-btn"
                    onClick={capturePhoto}
                    disabled={!isCameraActive}
                  >
                    <Camera className="w-6 h-6" />
                    Capture Card
                  </button>
                  <button className="secondary" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="captured-image-container">
                  <img src={capturedImage} alt="Captured card" className="captured-image" />
                </div>
                <p>Card captured! Processing OCR...</p>
                <div className="scan-controls">
                  <button 
                    className="capture-photo-btn"
                    onClick={() => {
                      setCapturedImage(null)
                      startCamera()
                    }}
                  >
                    <Camera className="w-6 h-6" />
                    Retake
                  </button>
                  <button className="secondary" onClick={resetForm}>
                    Done
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
            <div className="recording-visualizer">
              <Mic className={`mic-icon-large ${isRecording ? 'recording' : ''}`} />
              <div className={`audio-waves ${isRecording ? 'active' : ''}`}>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
            <p className="recording-status">
              {isRecording ? `Recording: ${formatTime(recordingTime)}` : 
               audioBlob ? 'Recording completed' : 'Ready to record'}
            </p>
            <div className="recording-controls">
              {!isRecording && !audioBlob && (
                <button className="record-btn" onClick={startRecording}>
                  <Mic className="w-6 h-6" />
                  Start Recording
                </button>
              )}
              {isRecording && (
                <button className="stop-btn" onClick={stopRecording}>
                  <Square className="w-6 h-6" />
                  Stop Recording
                </button>
              )}
              {audioBlob && (
                <>
                  <button className="play-btn" onClick={() => {
                    const audio = new Audio(URL.createObjectURL(audioBlob))
                    audio.play()
                  }}>
                    <Play className="w-6 h-6" />
                    Play Recording
                  </button>
                  <button className="record-btn" onClick={() => {
                    setAudioBlob(null)
                    setRecordingTime(0)
                  }}>
                    <Mic className="w-6 h-6" />
                    Record Again
                  </button>
                </>
              )}
              <button className="secondary" onClick={resetForm}>
                {audioBlob ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'text' && (
        <form className="form" onSubmit={onSubmit}>
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
                key={tag}
                className={tags.includes(tag) ? 'chip active' : 'chip'}
                onClick={() => toggleTag(tag)}
              >
                {tag}
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
