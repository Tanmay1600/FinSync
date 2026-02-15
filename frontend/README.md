# HTT CRM - Frontend Application

A Progressive Web App (PWA) for capturing and managing leads at conferences and events. Built with React, TypeScript, Vite, and powered by Google Gemini AI for intelligent business card extraction.

## 🚀 Features

### Lead Capture Modes

#### 🏢 Stall Mode (Kiosk/Booth)
- Quick visitor entry form
- Real-time duplicate detection (email/phone)
- Offline-first data storage
- Tag-based lead qualification

#### 📱 Field Mode (On-Floor Capture)
- **AI-Powered Business Card Scanning** - Uses Google Gemini 2.5 Pro to extract:
  - Contact name
  - Email address
  - Phone number
  - Contextual remarks (title, company, address)
- Audio note recording with offline transcription (Vosk)
- Manual text entry fallback
- Multiple capture methods in one interface

### Offline-First Architecture
- ✅ Works completely offline using IndexedDB (Dexie.js)
- ✅ Automatic sync when connection restored
- ✅ Offline queue with retry logic and max attempt limits
- ✅ Local cache cleared after successful sync
- ✅ PWA with service worker for offline assets

### Cloud Integrations
- **Cloudinary** - Automatic upload of business card images and audio notes
- **Google Gemini AI** - Vision-based OCR for business card extraction
- **Backend API** - Syncs interactions with tags, images, and audio URLs

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API
- **Database**: Dexie.js (IndexedDB wrapper)
- **Offline Storage**: IndexedDB with offline queue
- **AI/ML**: Google Gemini 2.5 Pro API
- **Speech Recognition**: Vosk (offline)
- **Cloud Storage**: Cloudinary
- **PWA**: Vite PWA Plugin
- **Styling**: Custom CSS with responsive design

## � Implementation Details (This Session)

This frontend application underwent significant enhancements to implement a production-ready AI-powered business card scanning system:

### 1. **Gemini AI Integration** (`src/lib/sync-service.ts`)
**What Was Built:**
- Complete Google Gemini 2.5 Pro vision API integration
- Inline image data transmission (base64 data URLs)
- Structured JSON extraction with strict schema enforcement
- Phone number normalization (remove `+`, extract 10 digits)
- Fallback email generation for incomplete extractions
- Token limit increase (256 → 1024) to prevent response truncation
- Comprehensive error handling (404, 403, 400 responses)

**Key Code:**
```typescript
endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent'
generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
prompt: "Extract contact info from business card. Return strict JSON: {name, email, phone, remarks}"
```

**API Flow:**
1. Capture card image → Store as data URL in IndexedDB
2. Upload to Cloudinary when online → Get permanent URL
3. Send inline base64 image to Gemini with extraction prompt
4. Parse JSON response → Extract name/email/phone/remarks
5. Clean phone (remove non-digits, keep last 10)
6. Create interaction via backend with extracted + Cloudinary data

### 2. **OCR Removal** (`src/components/FieldCapture.tsx`)
**What Was Removed:**
- Tesseract.js dependency and all client-side OCR logic
- `processOCR()`, `parseBusinessCardText()`, `preprocessImage()` functions
- OCR state variables: `isProcessingOCR`, `ocrProgress`, `ocrText`, `parsedInfo`
- Pre-save OCR execution in `handleSaveLead()`
- OCR UI indicators and progress displays

**Reason:** Gemini AI provides superior accuracy and no client-side processing overhead

### 3. **Tag System Unification** (`src/components/StallCapture.tsx`)
**Changes Made:**
- Added `tagIds` state array to track numeric tag IDs
- Updated `toggleTag()` to accept full tag object and track both labels and IDs
- Replaced `tag-pill` classes with `chip` classes to match Field mode styling
- Simplified layout from `tag-picker__grid` to `chips` div
- Passed `tagIds` to `addLead()` for backend sync

**Before:**
```tsx
toggleTag(tag: string) // Only tracked labels
<button className="tag-pill tag-pill--{color}">
```

**After:**
```tsx
toggleTag(tag: StallTagOption) // Tracks labels + IDs
<button className="chip chip-{color}">
```

### 4. **Cloudinary Upload Pipeline** (`src/lib/sync-service.ts`)
**Implemented:**
- SHA-1 signature generation for authenticated uploads
- Automatic folder organization (field_cards/, field_audio/)
- Data URL to Blob conversion for form submission
- Parallel upload of card images and audio notes
- Secure URL storage in backend interaction records

### 5. **Offline Queue Enhancements** (`src/lib/sync-service.ts`)
**Improvements:**
- Phone number validation and cleaning before sync
- Retry limit enforcement (max 3 attempts)
- Failed operation cleanup after max retries exceeded
- Local IndexedDB cache clearing after successful sync
- Detailed console logging for debugging (Gemini responses, API calls)

### 6. **Bug Fixes**
- Fixed "Save Lead" button in scan mode (added `onClick` handler)
- Removed dangling OCR references causing `ReferenceError`
- API key typo correction (removed extra 'A' in `.env`)
- Gemini model endpoint iterations (404 → working `gemini-2.5-pro`)

### 7. **Environment Configuration** (`.env`)
**Added Variables:**
```env
VITE_GEMINI_API_KEY=AIzaSy...  # Google AI Studio key
VITE_CLOUDINARY_CLOUD_NAME=xxx
VITE_CLOUDINARY_API_KEY=xxx
VITE_CLOUDINARY_API_SECRET=xxx
```

### 8. **Testing & Validation**
- Confirmed offline → online sync workflow
- Verified Gemini extraction accuracy with sample cards
- Validated phone number cleaning (e.g., `+1234567890` → `1234567890`)
- Tested fallback email generation (`9107476781@temp.email`)
- Confirmed IndexedDB clearing post-sync

## �📦 Installation

### Prerequisites
- Node.js 18+ and npm
- G🎯 Key Implementation Details

### Gemini AI Business Card Extraction

The app uses Google Gemini 2.5 Pro with vision capabilities to extract structured data from business cards:

**Process Flow:**
1. User captures/uploads business card image
2. Image stored as base64 data URL in IndexedDB
3. When online, image uploaded to Cloudinary
4. Gemini API receives inline image data with structured prompt
5. AI extracts: `{name, email, phone, remarks}`
6. Data used to create interaction via backend API

**Configuration:**
```typescript
// In sync-service.ts
endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent'
generationConfig: {
  temperature: 0.2,
  maxOutputTokens: 1024
}
```

**Key Features:**
- Strict JSON schema enforcement
- Phone number cleaning (removes +, keeps 10 digits)
- Email fallback generation if not detected
- Conservative extraction (no hallucination of data)

### Offline Queue & Sync Architecture

**Queue Management:**
- Operations stored in IndexedDB with retry counts
- Max 3 retry attempts before marking as failed
- Automatic sync when network restored
- Priority: CREATE_LEAD, UPDATE_LEAD, UPDATE_STAGE, ADD_HISTORY

**Sync Process:**
1. Pending operations fetched from queue
2. Cloudinary uploads (images, audio) - parallel
3. Gemini extraction (if card image exists)
4. Backend API interaction creation
5. Success → Remove from queue, update local lead
6. Failure → Increment retry, store error message
7. All synced → Clear local IndexedDB

**Data Flow:**
```
User Input (offline) → IndexedDB → Queue
         ↓
Network Online → Sync Service
         ↓
Cloudinary Upload + Gemini Parse → Backend API
         ↓
Success → Clear Local Cache
```

### Tag System

15 predefined tags with color coding:
- **Red** (High priority): High Intent, Meeting Requested, etc.
- **Yellow** (Medium): Exploring Options, Business Owner, etc.
- **Green** (Qualified): HNI Client, Wealth Management, etc.
- **Grey** (Low): Not Relevant

Each tag has:
- Unique ID (1-15)
- Label text
- Color class
- Priority score

**Implementation:**
- Both `tags` (labels) and `tagIds` (numeric) tracked
- Sent to backend as `tagIds` array
- Visual chips with active state toggle

## 🔒 Security Notes

- API keys stored in `.env`, never committed to git
- Auth tokens in localStorage with JWT validation
- Backend auth required for all interaction endpoints
- Phone numbers sanitized before storage

## 🐛 Troubleshooting

### Gemini 404/403 Errors
- Verify `VITE_GEMINI_API_KEY` is correct
- Check API is enabled in Google Cloud Console
- For AI Studio keys: Use `v1beta` endpoint
- For Cloud Console keys: Use `v1` endpoint

### Offline Sync Not Working
- Check browser console for queue errors
- Verify backend is running and accessible
- Check network tab for failed requests
- Clear IndexedDB via browser DevTools if corrupted

### Business Card Not Extracting
- Ensure good image quality and lighting
- Check `maxOutputTokens` is sufficient (1024+)
- Verify Gemini response in console logs
- Fallback to manual entry if AI fails

## 📚 Additional Documentation

- [OFFLINE_PWA_GUIDE.md](./OFFLINE_PWA_GUIDE.md) - PWA implementation details
- [../backend/README.md](../backend/README.md) - Backend API documentation

## 🔧 Development Tips

### oogle Gemini API key (from Google AI Studio or Cloud Console)
- Cloudinary account (for image/audio uploads)
- Backend API running (see `../backend/README.md`)

### Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the `frontend/` directory:

```env
# Backend API
VITE_API_URL=http://localhost:5000/api

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini AI (for business card OCR)
VITE_GEMINI_API_KEY=AIzaSy...your_key_here
```

3. **Run development server:**
```bash
npm run dev
```

Application runs on `http://localhost:5173`

4. **Build for production:**
```bash
npm run build
npm run preview  # Preview production build
```

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── FieldCapture.tsx      # Field lead capture with AI card scanning
│   │   ├── StallCapture.tsx      # Stall/booth quick entry form
│   │   ├── Dashboard.tsx         # Main dashboard view
│   │   └── auth/                 # Login/Register components
│   ├── context/
│   │   ├── AppContext.tsx        # Global app state + lead management
│   │   └── AuthContext.tsx       # Authentication state
│   ├── lib/
│   │   ├── api.ts                # Backend API client
│   │   ├── db.ts                 # Dexie IndexedDB schema
│   │   ├── sync-service.ts       # Offline sync + Gemini integration
│   │   └── offline-queue.ts      # Queue management with retry logic
│   ├── data/
│   │   └── stallTags.ts          # Tag definitions with colors and scores
│   └── hooks/
│       └── useVoskSpeechRecognition.ts  # Offline audio transcription
├── public/
│   └── models/                   # Vosk speech model files
└── vite.config.ts                # Vite + PWA configuration
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
