import { type FormEvent, useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { ScanLine, Mic, FileText, Plus, Camera, Loader, MicOff } from 'lucide-react'
import Tesseract from 'tesseract.js'
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

interface ParsedBusinessCard {
  name?: string
  company?: string
  email?: string
  phone?: string
  title?: string
}

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
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [audioNoteId, setAudioNoteId] = useState<number | null>(null)

  // OCR state
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrText, setOcrText] = useState('')
  const [parsedInfo, setParsedInfo] = useState<ParsedBusinessCard | null>(null)

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

  // Parse business card text to extract contact information
  const parseBusinessCardText = (text: string): ParsedBusinessCard => {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const parsed: ParsedBusinessCard = {}

    // Clean and normalize text
    const cleanedText = text.replace(/[^\w\s@.+()-]/g, ' ').replace(/\s+/g, ' ')
    
    // Enhanced Email regex - more comprehensive
    const emailRegex = /\b[A-Za-z0-9](?:[A-Za-z0-9._%-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g
    
    // Enhanced Phone regex - supports international formats
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|(?:\+\d{1,4}[-.\s]?)?(?:\([0-9]{1,4}\)[-.\s]?)?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}|(?:\d{3}[-.\s]?\d{3}[-.\s]?\d{4})|(?:\d{10})/g
    
    // Website/URL regex
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)?/g
    
    // Social media handles
    const socialRegex = /(?:@|linkedin\.com\/in\/|twitter\.com\/|facebook\.com\/)[a-zA-Z0-9._-]+/g
    
    // Job titles/positions regex
    const titleRegex = /\b(?:CEO|CTO|CFO|COO|VP|Vice President|President|Director|Manager|Senior|Jr|Junior|Lead|Head|Chief|Principal|Founder|Co-Founder|Partner|Associate|Consultant|Specialist|Analyst|Engineer|Developer|Designer|Architect|Coordinator|Executive|Officer|Administrator|Supervisor|Representative|Sales|Marketing|Operations|Finance|HR|Human Resources|IT|Technical|Business|Product|Project)\b/gi

    // Extract emails with validation
    const emailMatches = cleanedText.match(emailRegex)
    if (emailMatches) {
      // Filter out obvious false positives
      const validEmail = emailMatches.find(email => {
        const domainPart = email.split('@')[1]?.toLowerCase()
        return domainPart && 
               !domainPart.includes('..') &&
               domainPart.length > 2 &&
               !domainPart.startsWith('.') &&
               !domainPart.endsWith('.')
      })
      if (validEmail) {
        parsed.email = validEmail.toLowerCase()
      }
    }
    
    // Extract phone numbers with cleaning
    const phoneMatches = cleanedText.match(phoneRegex)
    if (phoneMatches) {
      // Find the most likely phone number (prefer longer, formatted numbers)
      const validPhone = phoneMatches
        .map(phone => phone.replace(/\s+/g, ' ').trim())
        .filter(phone => {
          // Remove obvious false positives
          const digitsOnly = phone.replace(/\D/g, '')
          return digitsOnly.length >= 10 && digitsOnly.length <= 15
        })
        .sort((a, b) => b.length - a.length)[0] // Prefer longer formatted numbers
      
      if (validPhone) {
        parsed.phone = validPhone
      }
    }

    // Extract websites
    const websiteMatches = cleanedText.match(websiteRegex)
    if (websiteMatches) {
      const website = websiteMatches[0]
      // Store as additional info (could extend ParsedBusinessCard interface)
      console.log('Website found:', website)
    }

    // Process each line for name, company, and title
    const meaningfulLines = lines
      .map(line => line.trim())
      .filter(line => 
        line.length > 2 && 
        line.length < 80 &&
        !emailRegex.test(line) && 
        !phoneRegex.test(line) &&
        !websiteRegex.test(line) &&
        !socialRegex.test(line)
      )

    // Enhanced name detection
    for (let i = 0; i < meaningfulLines.length && i < 6; i++) {
      const line = meaningfulLines[i]
      
      if (!parsed.name) {
        const words = line.split(/\s+/)
        const isAllCaps = line === line.toUpperCase()
        const hasProperCase = words.length >= 2 && words.length <= 4 && 
                             words.every(word => 
                               word.length > 0 && 
                               word.charAt(0) === word.charAt(0).toUpperCase() &&
                               word.slice(1) === word.slice(1).toLowerCase()
                             )
        
        // Business/organization keywords
        const orgKeywords = ['ltd', 'llc', 'inc', 'corp', 'company', 'co', 'pvt', 'limited', 'group', 'solutions', 'services', 'technologies', 'enterprises', 'systems', 'consulting', 'partners', 'associates', 'international', 'global', 'worldwide', 'holdings', 'foundation', 'institute', 'university', 'hospital', 'clinic', 'bank', 'financial']
        const lowerLine = line.toLowerCase()
        const hasOrgKeyword = orgKeywords.some(keyword => lowerLine.includes(keyword))
        
        // Title keywords
        const hasTitle = titleRegex.test(line)
        
        // Name patterns: proper case, 2-4 words, no org keywords, no titles
        if (hasProperCase && !isAllCaps && !hasOrgKeyword && !hasTitle) {
          // Additional validation for names
          const namePattern = /^[A-Z][a-z]+(?: [A-Z][a-z.]*){1,3}$/
          if (namePattern.test(line) || (words.length === 2 && hasProperCase)) {
            parsed.name = line
            continue
          }
        }
      }
    }

    // Enhanced company name detection
    for (let i = 0; i < meaningfulLines.length && i < 8; i++) {
      const line = meaningfulLines[i]
      
      if (!parsed.company && line !== parsed.name) {
        const lowerLine = line.toLowerCase()
        const isAllCaps = line === line.toUpperCase()
        
        // Company indicators
        const companyKeywords = ['ltd', 'llc', 'inc', 'corp', 'corporation', 'company', 'co', 'pvt', 'private', 'limited', 'group', 'solutions', 'services', 'technologies', 'tech', 'enterprises', 'systems', 'consulting', 'consultancy', 'partners', 'associates', 'international', 'global', 'worldwide', 'holdings', 'foundation', 'institute']
        const hasCompanyKeyword = companyKeywords.some(keyword => lowerLine.includes(keyword))
        
        // Industry-specific terms
        const industryTerms = ['software', 'digital', 'media', 'marketing', 'finance', 'financial', 'insurance', 'real estate', 'healthcare', 'medical', 'pharmaceutical', 'manufacturing', 'retail', 'wholesale', 'logistics', 'transportation', 'education', 'research', 'development', 'engineering', 'construction', 'energy', 'oil', 'gas', 'banking', 'investment', 'capital', 'ventures', 'innovations', 'communications', 'telecommunications', 'networks', 'security', 'defense']
        const hasIndustryTerm = industryTerms.some(term => lowerLine.includes(term))
        
        if (hasCompanyKeyword || (isAllCaps && line.length > 3) || hasIndustryTerm) {
          // Clean up company name
          let companyName = line
          if (isAllCaps) {
            // Convert ALL CAPS to Title Case
            companyName = line.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
          }
          parsed.company = companyName
          continue
        }
      }
    }

    // Job title detection
    for (const line of meaningfulLines) {
      if (!parsed.title && line !== parsed.name && line !== parsed.company) {
        const titleMatch = line.match(titleRegex)
        if (titleMatch || 
            (line.toLowerCase().includes('manager') || 
             line.toLowerCase().includes('director') ||
             line.toLowerCase().includes('executive'))) {
          parsed.title = line
          break
        }
      }
    }

    // Fallback: if no name found, try first non-company line
    if (!parsed.name && meaningfulLines.length > 0) {
      for (const line of meaningfulLines) {
        if (line !== parsed.company && !titleRegex.test(line)) {
          const words = line.split(/\s+/)
          if (words.length >= 2 && words.length <= 4 && line.length < 40) {
            parsed.name = line
            break
          }
        }
      }
    }

    return parsed
  }



  // Process OCR on captured image
  const processOCR = async (imageDataUrl: string) => {
    setIsProcessingOCR(true)
    setOcrProgress(0)
    setOcrText('')

    try {
      // Preprocess image for better OCR
      const preprocessedImage = await preprocessImage(imageDataUrl)
      
      const { data: { text } } = await Tesseract.recognize(
        preprocessedImage,
        'eng',
        {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100))
            }
          },
        }
      )

      setOcrText(text)
      const parsed = parseBusinessCardText(text)
      setParsedInfo(parsed)

      // Auto-fill form fields if parsing was successful
      if (parsed.name) setName(parsed.name)
      if (parsed.company) setCompany(parsed.company)
      if (parsed.email) setEmail(parsed.email)
      if (parsed.phone) setPhone(parsed.phone)

    } catch (error) {
      console.error('OCR processing failed:', error)
      alert('OCR processing failed. Please try again or enter details manually.')
    } finally {
      setIsProcessingOCR(false)
      setOcrProgress(0)
    }
  }

  // Preprocess image to improve OCR accuracy
  const preprocessImage = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Set canvas size to image size
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw original image
        ctx.drawImage(img, 0, 0)
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Convert to grayscale and enhance contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale conversion
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          
          // Enhance contrast (simple threshold)
          const enhanced = gray > 128 ? 255 : 0
          
          data[i] = enhanced     // Red
          data[i + 1] = enhanced // Green  
          data[i + 2] = enhanced // Blue
          // Alpha stays the same
        }
        
        // Put processed data back
        ctx.putImageData(imageData, 0, 0)
        
        // Return processed image as data URL
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.src = imageDataUrl
    })
  }

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
        
        // Start OCR processing
        processOCR(imageData)
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
        } catch (error) {
          console.error('Failed to save audio note to IndexedDB:', error)
        } finally {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
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
    if (!name.trim()) return
    setSaving(true)
    const leadId = await addLead({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      interest: note.trim() || undefined,
      audioTranscript: voskTranscript?.trim() || undefined,
      tags,
      tagIds,
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
    setCapturedImage(null)
    setAudioBlob(null)
    setAudioNoteId(null)
    setIsRecording(false)
    setRecordingTime(0)
    setIsProcessingOCR(false)
    setOcrProgress(0)
    setOcrText('')
    setParsedInfo(null)
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
    setAudioNoteId(null)
    setIsRecording(false)
    setRecordingTime(0)
    setIsProcessingOCR(false)
    setOcrProgress(0)
    setOcrText('')
    setParsedInfo(null)
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
                  {!isCameraActive && (
                    <div className="camera-overlay">
                      <Camera className="scan-icon-large" />
                      <p>Starting camera...</p>
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
                  
                  {/* OCR Processing Overlay */}
                  {isProcessingOCR && (
                    <div className="ocr-overlay">
                      <div className="ocr-progress">
                        <Loader className="w-6 h-6 animate-spin" />
                        <span>Processing card... {ocrProgress}%</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* OCR Results */}
                {parsedInfo && !isProcessingOCR && (
                  <div className="ocr-results">
                    <h4>✅ Card Information Detected:</h4>
                    <div className="ocr-info">
                      {parsedInfo.name && <div><strong>Name:</strong> {parsedInfo.name}</div>}
                      {parsedInfo.company && <div><strong>Company:</strong> {parsedInfo.company}</div>}
                      {parsedInfo.email && <div><strong>Email:</strong> {parsedInfo.email}</div>}
                      {parsedInfo.phone && <div><strong>Phone:</strong> {parsedInfo.phone}</div>}
                    </div>
                    {ocrText && (
                      <details className="ocr-debug">
                        <summary>View raw OCR text</summary>
                        <pre className="ocr-raw-text">{ocrText}</pre>
                      </details>
                    )}
                  </div>
                )}
                
                <p>
                  {isProcessingOCR 
                    ? 'Extracting text from visiting card...' 
                    : parsedInfo 
                    ? 'Information extracted! Review and edit below.'
                    : 'Card captured! Processing OCR...'
                  }
                </p>
                
                <div className="scan-controls">
                  <button 
                    className="capture-photo-btn"
                    onClick={() => {
                      setCapturedImage(null)
                      setParsedInfo(null)
                      setOcrText('')
                      setIsProcessingOCR(false)
                      startCamera()
                    }}
                    disabled={isProcessingOCR}
                  >
                    <Camera className="w-6 h-6" />
                    Use Camera
                  </button>
                  
                  <button 
                    className="secondary" 
                    type="button"
                    onClick={() => setMode('text')}
                    disabled={isProcessingOCR}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'scan' && parsedInfo && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); handleSaveLead() }}>
          <div className="form-notice">
            <p>✨ Information auto-filled from visiting card. Please review and edit as needed:</p>
          </div>
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
            Additional notes
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
