"""
Vosk Speech Recognition Service for Audio Transcription
"""
import os
import json
import logging
from typing import Optional
import wave
from vosk import Model, KaldiRecognizer
from pydub import AudioSegment

logger = logging.getLogger(__name__)

# Allow setting FFmpeg path via environment variables
_ffmpeg_path = os.getenv("FFMPEG_PATH")
_ffprobe_path = os.getenv("FFPROBE_PATH")
if _ffmpeg_path:
    AudioSegment.converter = _ffmpeg_path
    logger.info(f"Using custom FFmpeg path: {_ffmpeg_path}")
if _ffprobe_path:
    AudioSegment.ffprobe = _ffprobe_path
    logger.info(f"Using custom FFprobe path: {_ffprobe_path}")


class VoskTranscriber:
    """Service for transcribing audio files using Vosk"""
    
    def __init__(self, model_path: str):
        """
        Initialize Vosk transcriber with model
        
        Args:
            model_path: Path to Vosk model directory
        """
        self.model_path = model_path
        self._model = None
        
    def _load_model(self):
        """Lazy load Vosk model"""
        if self._model is None:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Vosk model not found at {self.model_path}")
            
            logger.info(f"Loading Vosk model from {self.model_path}")
            self._model = Model(self.model_path)
            logger.info("Vosk model loaded successfully")
        
        return self._model
    
    def _convert_to_wav(self, audio_path: str, output_path: str) -> str:
        """
        Convert audio file to WAV format with 16kHz sample rate (required by Vosk)
        
        Args:
            audio_path: Path to input audio file
            output_path: Path for output WAV file
            
        Returns:
            Path to converted WAV file
        """
        logger.info(f"Converting audio to WAV format: {audio_path}")
        
        try:
            # Load audio file (supports mp3, m4a, ogg, opus, etc.)
            audio = AudioSegment.from_file(audio_path)
            
            # Convert to mono, 16kHz sample rate, 16-bit PCM (Vosk requirement)
            audio = audio.set_channels(1)  # Mono
            audio = audio.set_frame_rate(16000)  # 16kHz
            audio = audio.set_sample_width(2)  # 16-bit (2 bytes)
            
            # Export as WAV with 16-bit PCM
            audio.export(output_path, format="wav", parameters=["-acodec", "pcm_s16le"])
            logger.info(f"Audio converted to WAV: {output_path}")
            
            return output_path
        except FileNotFoundError as e:
            logger.error("FFmpeg not found. Please install FFmpeg and add it to system PATH.")
            logger.error("Windows: Download from https://www.gyan.dev/ffmpeg/builds/ (ffmpeg-release-essentials.zip)")
            logger.error("Extract and add the 'bin' folder to your system PATH environment variable")
            raise RuntimeError("FFmpeg is required for audio processing but not found in system PATH") from e
    
    def transcribe(self, audio_path: str) -> Optional[str]:
        """
        Transcribe audio file to text
        
        Args:
            audio_path: Path to audio file (any format supported by pydub)
            
        Returns:
            Transcribed text or None if transcription fails
        """
        try:
            model = self._load_model()
            
            # Convert to WAV if needed
            wav_path = audio_path
            if not audio_path.lower().endswith('.wav'):
                wav_path = audio_path.rsplit('.', 1)[0] + '_converted.wav'
                self._convert_to_wav(audio_path, wav_path)
            else:
                # Even if it's .wav, ensure it's 16kHz mono
                temp_path = audio_path.rsplit('.', 1)[0] + '_temp.wav'
                self._convert_to_wav(audio_path, temp_path)
                wav_path = temp_path
            
            # Open WAV file
            wf = wave.open(wav_path, "rb")
            
            # Verify format
            if wf.getnchannels() != 1:
                logger.error(f"Audio must be mono. Got {wf.getnchannels()} channels")
                wf.close()
                return None
            if wf.getsampwidth() != 2:
                logger.error(f"Audio must be 16-bit PCM. Got {wf.getsampwidth() * 8}-bit")
                wf.close()
                return None
            if wf.getframerate() not in [8000, 16000, 32000, 48000]:
                logger.error(f"Audio sample rate must be 8kHz, 16kHz, 32kHz, or 48kHz. Got {wf.getframerate()}Hz")
                wf.close()
                return None
            
            # Create recognizer
            rec = KaldiRecognizer(model, wf.getframerate())
            rec.SetWords(True)
            
            # Process audio
            transcript_parts = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if 'text' in result and result['text']:
                        transcript_parts.append(result['text'])
            
            # Get final result
            final_result = json.loads(rec.FinalResult())
            if 'text' in final_result and final_result['text']:
                transcript_parts.append(final_result['text'])
            
            wf.close()
            
            # Clean up converted file
            if wav_path != audio_path and os.path.exists(wav_path):
                os.remove(wav_path)
            
            # Combine transcript
            full_transcript = ' '.join(transcript_parts).strip()
            
            if not full_transcript:
                logger.warning("Transcription resulted in empty text")
                return None
            
            logger.info(f"Transcription successful: {len(full_transcript)} characters")
            return full_transcript
            
        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            return None
