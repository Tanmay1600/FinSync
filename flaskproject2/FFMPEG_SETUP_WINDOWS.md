# FFmpeg Installation Guide for Windows

FFmpeg is required for audio processing in the WhatsApp bot. Follow these steps to install it:

## Quick Installation

### Method 1: Download Pre-built Binary (Recommended)

1. **Download FFmpeg**
   - Visit: https://www.gyan.dev/ffmpeg/builds/
   - Download: **ffmpeg-release-essentials.zip** (latest version)
   - File size: ~80MB

2. **Extract Files**
   - Extract the ZIP file to a permanent location
   - Example: `C:\ffmpeg\`
   - Inside you'll see: `bin`, `doc`, `presets`

3. **Add to System PATH**
   
   **Option A: Using System Settings (Permanent)**
   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find and select "Path"
   - Click "Edit"
   - Click "New"
   - Add: `C:\ffmpeg\bin` (or wherever you extracted it)
   - Click "OK" on all dialogs
   - **Restart your terminal/command prompt**

   **Option B: Using Command Prompt (Current Session)**
   ```cmd
   set PATH=%PATH%;C:\ffmpeg\bin
   ```

4. **Verify Installation**
   ```cmd
   ffmpeg -version
   ```
   You should see FFmpeg version information.

5. **Restart Python Application**
   - Stop your Flask app (Ctrl+C)
   - Start it again: `python app.py`
   - Now audio transcription should work!

### Method 2: Using Chocolatey (If you have Chocolatey installed)

```powershell
choco install ffmpeg
```

### Method 3: Using Scoop (If you have Scoop installed)

```powershell
scoop install ffmpeg
```

## Troubleshooting

### "FFmpeg not found" error persists
- Make sure you restarted your terminal after adding to PATH
- Verify FFmpeg is in PATH: `echo %PATH%` (should contain `C:\ffmpeg\bin`)
- Try running: `where ffmpeg` (should show the path to ffmpeg.exe)

### Permission Issues
- Run Command Prompt as Administrator when adding to system PATH
- Or add to "User variables" instead of "System variables"

### Audio Still Not Processing
1. Check logs for specific error
2. Verify Vosk model is installed: `dir vosk-model-small-en-us-0.15`
3. Check `.env` has: `VOSK_MODEL_PATH=vosk-model-small-en-us-0.15`

## Current Status

After following these steps, restart your bot and test with a voice note. The bot should now:
1. Download audio from WhatsApp ✓
2. Convert to WAV using FFmpeg ✓ (was failing before)
3. Transcribe with Vosk ✓
4. Analyze with Gemini ✓
5. Create interaction ✓

## Alternative: Programmatic FFmpeg Path

If you can't add FFmpeg to system PATH, you can set it programmatically in your `.env`:

```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
```

Then update `vosk_service.py` to use:
```python
from pydub import AudioSegment
AudioSegment.converter = os.getenv("FFMPEG_PATH", "ffmpeg")
AudioSegment.ffprobe = os.getenv("FFPROBE_PATH", "ffprobe")
```
