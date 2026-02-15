# Hack The Tank - CRM Lead Capture System

An intelligent, offline-first Progressive Web App for capturing and managing conference/event leads with AI-powered business card scanning.

## 🚀 Overview

HTT CRM is a dual-mode lead capture platform designed for trade shows, conferences, and networking events:

**🏢 Stall Mode** - Kiosk/booth quick entry for walk-in visitors  
**📱 Field Mode** - Mobile-first on-floor capture with AI business card scanning

### Key Highlights

- 🤖 **Google Gemini AI** - Extracts name, email, phone, and context from business card photos
- 📴 **Offline-First** - Works without internet, syncs automatically when online
- ☁️ **Cloudinary Integration** - Automatic upload of card images and audio notes
- 🏷️ **Smart Tagging** - 15 predefined tags with color coding and priority scores
- 🔐 **Multi-tenant** - Organization-based access with admin/agent roles
- 📊 **Lead Scoring** - Automatic qualification based on interaction tags

## 🏗️ Architecture

```
HTT CRM/
├── frontend/              # React + TypeScript + Vite PWA
│   ├── Gemini AI integration for card OCR
│   ├── Dexie.js IndexedDB for offline storage
│   ├── Offline queue with retry logic
│   ├── Cloudinary uploads
│   └── Vosk offline speech recognition
│
├── backend/               # Flask REST API
│   ├── JWT authentication
│   ├── PostgreSQL (Supabase)
│   ├── Interaction tracking
│   ├── Tag system with scoring
│   └── Organization multi-tenancy
│
└── flaskproject2/         # WhatsApp Bot (separate service)
    └── Experimental WhatsApp integration
```

## 🎯 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **PostgreSQL** (Supabase recommended)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/))
- **Cloudinary Account** ([Sign up free](https://cloudinary.com/))

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure .env (see backend/README.md for details)
# Set DATABASE_URL, JWT_SECRET_KEY, etc.

# Run server
python app.py
```

Backend API runs on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure .env (see frontend/README.md for details)
# Set VITE_GEMINI_API_KEY, VITE_CLOUDINARY_*, etc.

# Run development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### 3. Initial Setup

1. Register a new user at `/register` (creates organization + admin user)
2. Login and start capturing leads
3. Test offline: Disable network, capture leads, re-enable to sync

## 🎨 Features Breakdown

### Field Mode Workflow

1. **Capture Business Card** - Camera or file upload
2. **AI Extraction** - Gemini analyzes image, extracts structured data
3. **Tag & Annotate** - Select tags, add voice/text notes
4. **Offline Storage** - Saved to IndexedDB if offline
5. **Auto-Sync** - When online, uploads to Cloudinary → creates interaction in backend
6. **Cache Clear** - Local data cleared after successful sync

### Stall Mode Workflow

1. **Quick Form** - Name (optional), email, phone (required)
2. **Tag Selection** - Choose interest tags
3. **Duplicate Check** - Validates against existing leads in queue
4. **Offline Queue** - Stored locally until synced
5. **Background Sync** - Automatic when network available

### Tag System

15 pre-configured tags with color coding:

| Color  | Tags | Score Range |
|--------|------|-------------|
| 🔴 Red | High Intent, Meeting Requested, Follow-up Needed, Interested, Call Tomorrow, Referred Lead | 4-10 pts |
| 🟡 Yellow | Exploring Options, Met at Stall, Networking Floor, Business Owner | 1-2 pts |
| 🟢 Green | HNI Client, Wealth Management, Tax Planning, Mutual Funds | 2-3 pts |
| ⚪ Grey | Not Relevant | -10 pts |

## 📚 Detailed Documentation

- **[Frontend README](./frontend/README.md)** - React app, Gemini integration, offline sync
- **[Backend README](./backend/README.md)** - API endpoints, data models, authentication
- **[Frontend PWA Guide](./frontend/OFFLINE_PWA_GUIDE.md)** - Offline architecture details

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Dexie.js (IndexedDB wrapper)
- Google Gemini 2.5 Pro (AI vision)
- Cloudinary (media storage)
- Vosk (offline speech recognition)
- Vite PWA Plugin

### Backend
- Flask (Python web framework)
- SQLAlchemy + Alembic (ORM + migrations)
- PostgreSQL via Supabase
- JWT authentication
- Bcrypt password hashing

## 🔒 Security & Privacy

- **No OCR Processing on Device** - All extraction done via Gemini API
- **Encrypted Passwords** - Bcrypt hashing
- **JWT Tokens** - Secure API authentication
- **Organization Isolation** - Data segregated by orgId
- **API Key Protection** - Never committed to git (.env files)

## 🧪 Testing

### Test Offline Mode
1. Open DevTools → Network tab → Set to "Offline"
2. Capture a lead in Field or Stall mode
3. Check Application → IndexedDB → `htt-crm-db` → `operations`
4. Re-enable network
5. Watch console for sync logs

### Test Gemini Extraction
1. Upload a sample business card image
2. Open console → Look for `[Sync] Gemini extracted text:`
3. Verify parsed JSON contains name, email, phone

## 🐛 Common Issues

**Gemini 404/403 Errors:**
- Verify API key is correct and active
- Check Google Cloud Console → APIs & Services → Generative Language API is enabled
- For AI Studio keys: use `v1beta` endpoint
- For Cloud Console keys: use `v1` endpoint

**Sync Not Working:**
- Check backend is running on port 5000
- Verify `VITE_API_URL` in frontend `.env`
- Check browser console for auth errors
- Use DevTools → Application → IndexedDB to inspect queue

**Business Card Not Reading:**
- Ensure good lighting and card is flat
- Check console for Gemini response
- Verify `maxOutputTokens` is 1024+ in sync-service.ts
- Fallback to manual entry if needed

## 📈 Future Enhancements

- [ ] QR code scanning for digital business cards
- [ ] Bulk import from CSV
- [ ] Email campaign integration
- [ ] Analytics dashboard
- [ ] WhatsApp integration (see `flaskproject2/`)
- [ ] Lead assignment workflows
- [ ] Export to CRM systems (Salesforce, HubSpot)

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

This project was developed for Hack The Tank hackathon. Contributions welcome!

---

**Built with ❤️ by DevDominators**
- **Backend**: Flask API with CORS enabled
- **Monorepo**: Single repository structure for easy management
