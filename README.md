# Hack The Tank

A Full-Stack Application with separate Frontend and Backend services.

## Project Structure

```
├── frontend/          # React + TypeScript + Vite + PWA
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/           # Flask API
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── app.py
│   ├── requirements.txt
│   └── venv/
```

## Getting Started

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Backend Setup

```bash
cd backend
python -m venv venv
.\venv\scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python app.py
```

Backend API runs on `http://localhost:5000`

## Features

- **Frontend**: React with TypeScript, Vite build tool, and PWA support
- **Backend**: Flask API with CORS enabled
- **Monorepo**: Single repository structure for easy management
