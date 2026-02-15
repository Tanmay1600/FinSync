# Audio Transcription Feature

## Overview
The WhatsApp bot now supports direct voice note processing with automatic transcription and analysis. When a user sends a voice note, the bot will:

1. Download the audio from WhatsApp
2. Transcribe it using Vosk (offline speech recognition)
3. Analyze the transcript with Gemini AI to extract key information
4. Create an interaction with the extracted data
5. Auto-authenticate the user if needed

## Setup

### 1. Install Dependencies
All required packages are already in `requirements.txt`:
- `vosk` - Offline speech recognition engine
- `pydub` - Audio format conversion
- `ffmpeg-python` - Audio processing (requires FFmpeg binary)
- `PyJWT` - JWT token handling

Install FFmpeg:
- **Windows**: Download from https://ffmpeg.org/download.html and add to PATH
- **Linux**: `sudo apt-get install ffmpeg`
- **macOS**: `brew install ffmpeg`

### 2. Download Vosk Model
1. Visit https://alphacephei.com/vosk/models
2. Download a suitable model (recommended: `vosk-model-small-en-us-0.15` for English)
3. Unzip the model folder into your project root (e.g., `flaskproject2/vosk-model-small-en-us-0.15`)

### 3. Configure Environment
Add to your `.env` file:
```env
VOSK_MODEL_PATH=vosk-model-small-en-us-0.15
GEMINI_API_KEY=your_gemini_api_key_here
```

## How It Works

### Audio Processing Flow
```
Voice Note → Download from WhatsApp
            ↓
        Convert to WAV (16kHz mono)
            ↓
        Vosk Transcription
            ↓
        Gemini Analysis (extract name, phone, company, summary)
            ↓
        Upload audio to Cloudinary
            ↓
        Auto-authenticate user
            ↓
        Create interaction with transcript
```

### User Experience
**User:** *Sends voice note saying "Hi, this is John Smith from Acme Corp, interested in your financial planning services"*

**Bot:** 
> 🎤 Processing your voice note, transcribing and analyzing...
> 
> ✅ Voice note processed successfully!
> 
> Summary: John Smith from Acme Corp interested in financial planning services
> Reference: 12345

The interaction is automatically created with:
- **Name**: John Smith (extracted from transcript)
- **Company**: Acme Corp
- **Phone**: User's WhatsApp number (fallback)
- **Remarks**: Full transcript + Gemini summary
- **Audio URL**: Cloudinary link for playback
- **Mode**: field
- **Tags**: Default tag IDs

### Supported Audio Formats
The bot supports all WhatsApp audio formats through pydub:
- `.ogg` (WhatsApp default)
- `.mp3`
- `.m4a`
- `.opus`
- `.wav`

All audio is automatically converted to WAV 16kHz mono for Vosk processing.

## Code Architecture

### VoskTranscriber (`services/vosk_service.py`)
```python
transcriber = VoskTranscriber(model_path="vosk-model-small-en-us-0.15")
transcript = transcriber.transcribe("audio.ogg")
# Returns: "hi this is john smith from acme corp..."
```

- Lazy-loads Vosk model on first use
- Converts audio to required format automatically
- Returns text transcript or None on failure

### GeminiService (`services/gemini_service.py`)
```python
gemini = get_gemini_service()
analysis = gemini.analyze_transcript(transcript)
# Returns: {"name": "John Smith", "phone": None, "company": "Acme Corp", "remarks": "..."}
```

- Extracts structured data from conversational text
- Returns name, phone, company, and summary
- Returns null for missing fields (no guessing)

### ConversationEngine (`conversation_engine.py`)
The `_process_voice_note()` method orchestrates the entire flow:
1. Download audio from WhatsApp
2. Save to temporary file
3. Transcribe with Vosk
4. Analyze with Gemini
5. Upload to Cloudinary
6. Auto-authenticate
7. Create interaction
8. Clean up temp files

## Error Handling

### Transcription Failures
If Vosk cannot transcribe the audio:
```
❌ Unable to transcribe the audio.

Please ensure:
• Audio is clear with minimal background noise
• Speech is audible

Try recording again or type 'new' for manual entry.
```

### Missing Vosk Model
If the model path is not found:
```
⚠️ Audio transcription service not configured.

Please contact admin to enable voice note processing.
Or type 'new' for manual entry.
```

### API Errors
If authentication fails or interaction creation fails:
- Auto-retries once with fresh token
- Falls back to user_not_found or interaction_failed messages

## Testing

### Quick Test
1. Start the bot: `python app.py`
2. Send a voice note to your WhatsApp number
3. Bot should respond with "Processing your voice note..."
4. Wait for transcription and analysis
5. Receive confirmation with summary

### Debug Mode
Enable debug logging to see detailed transcription output:
```python
import logging
logging.getLogger("vosk_service").setLevel(logging.DEBUG)
logging.getLogger("conversation_engine").setLevel(logging.DEBUG)
```

## Performance Notes

- **Transcription Speed**: ~1x realtime (60 second audio takes ~60 seconds)
- **Model Size**: Small models (~40MB) are faster but less accurate; large models (~1GB) are slower but more accurate
- **Memory Usage**: Vosk model stays loaded in memory after first use
- **Offline**: Vosk works completely offline (no internet needed for transcription)
- **Gemini**: Requires internet for analysis (but continues with transcript-only if it fails)

## Limitations

- **Language**: Current setup uses English model only (multilingual models available)
- **Accuracy**: Depends on audio quality and accent
- **Phone Extraction**: Phone numbers spoken in words may not be extracted correctly
- **Name Extraction**: Requires names to be explicitly stated in the conversation

## Future Enhancements

- [ ] Support multiple language models
- [ ] Add confidence scores to transcriptions
- [ ] Speaker diarization for multi-person conversations
- [ ] Real-time streaming transcription
- [ ] Sentiment analysis in Gemini prompt
- [ ] Custom vocabulary for domain-specific terms
