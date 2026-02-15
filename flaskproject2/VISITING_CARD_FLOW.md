# Visiting Card Processing Flow

## Overview
When a user sends an image to the WhatsApp bot, it's automatically processed as a visiting card with the following features:
- **Immediate processing** (no queuing delays)
- **Compulsory Gemini OCR extraction** - won't proceed without successful extraction
- **Auto-authentication** with token refresh on expiry
- **Gemini AI extraction** of name, phone, email, company, designation, and remarks
- **Cloudinary upload** of the image
- **Automatic interaction creation** in the backend with extracted data

## Flow Diagram

```
User sends image → Webhook receives
                          ↓
                   Download from WhatsApp
                          ↓
                   Upload to Cloudinary
                          ↓
                   **COMPULSORY: Extract via Gemini OCR**
                   (fails if extraction unsuccessful)
                          ↓
                   Validate name or phone extracted
                          ↓
                   Get/Refresh auth token
                          ↓
                   Create interaction with extracted data
                          ↓
                   Send success message to user
```

## Authentication Handling

The bot automatically handles authentication:

1. **First attempt**: Uses cached token from session
2. **If no token**: Automatically authenticates using encrypted phone number
3. **If auth fails (401/403)**: Clears cache and re-authenticates
4. **Auto-retry**: Retries the interaction creation with fresh token

## Configuration

Required environment variables in `.env`:

```bash
# WhatsApp credentials
ACCESS_TOKEN=your_whatsapp_access_token
PHONE_NUMBER_ID=your_phone_number_id

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Backend API
INTERACTIONS_API_URL=https://your-backend.com/api/interactions
DEFAULT_TAG_IDS=1,2,3

# Authentication
AUTH_API_URL=http://localhost:5000/api/auth/encrypted-login
AES_KEY=your_base64_encoded_aes_key

# Gemini AI (REQUIRED for visiting card OCR)
GEMINI_API_KEY=your_gemini_api_key
```

## User Experience

### Direct image send (no commands needed!)
**User**: [Sends visiting card photo directly]

### Bot processes immediately
- Downloads image from WhatsApp ⬇️
- Uploads to Cloudinary ☁️
- **Extracts text via Gemini OCR** 🧠 (MANDATORY)
  - Name, phone, email, company, designation
  - Validates at least name OR phone is present
  - **Fails with clear message if extraction unsuccessful**
- Auto-authenticates user (or uses cached token) 🔐
- Creates interaction with OCR-extracted data 💾
- Auto-retries if token expired 🔄

### Success response
**Bot**: 
```
✅ Visiting card processed successfully!

Name: John Doe
Phone: +919876543210
Reference: 12345
```

### No need for "new" command
Users can send images **anytime, anywhere** in the conversation. The bot will:
- Immediately detect it's an image
- Process it as a visiting card
- Extract and save details
- No command typing required!

## Error Handling

- **Gemini not configured**: Shows message to contact admin or use manual entry
- **OCR extraction fails**: Shows clear message asking user to retake photo with better quality
- **No name/phone extracted**: Fails with guidance on image quality (won't create interaction)
- **User not registered**: Shows "user not found" message
- **Auth expired**: Automatically re-authenticates and retries
- **API failures**: Shows error message with details
- **Network issues**: Shows error, user can try again

## Success Response Examples

### Full extraction success
```
✅ Visiting card processed successfully!

Name: Rajesh Kumar
Phone: +919876543210
Reference: 12345
```

### OCR Failure (clear guidance)
```
❌ Unable to extract details from the visiting card.

Please ensure:
• Image is clear and well-lit
• Text is readable
• Card is fully visible in frame

Try taking another photo or type 'new' for manual entry.
```

## Technical Details

### Files Modified
- `conversation_engine.py`: 
  - Added `_process_visiting_card()` with compulsory OCR
  - Added `_get_or_refresh_token()` for smart token management
  - Fails gracefully if OCR extraction unsuccessful
- `services/gemini_service.py`: 
  - Enhanced OCR-focused prompt for better extraction
  - Extracts: name, email, phone, company, designation, remarks
  - Validates extraction results (name or phone required)
  - Raises error if OCR fails
- `services/__init__.py`: Exported Gemini service
- `config.py`: Added GEMINI_API_KEY configuration (required)

### Key Features
1. **Compulsory OCR**: Won't create interaction without successful Gemini extraction
2. **Enhanced Gemini Prompt**: 
   - Detailed OCR instructions for visiting cards
   - Extracts 6 fields: name, email, phone, company, designation, remarks
   - Validates name or phone is present
   - Strict JSON output format
3. **Smart auth**: Auto-refresh on expiry, no manual re-login needed
4. **Clear error messages**: Guides users on image quality if OCR fails
5. **One-time retry**: Auto-retries API calls once on auth failure
6. **Fallback handling**: Uses WhatsApp phone if card phone not readable

## Testing

1. Send an image to the bot
2. Bot should respond with "Processing..." then success message
3. Check backend for created interaction with extracted details
4. If token expires mid-conversation, bot should auto-refresh and continue

## Future Enhancements
- Support for multiple images in one message
- Audio transcript extraction for voice notes
- Offline queue fallback (currently available in `card_processor.py`)
- Batch processing for multiple cards
