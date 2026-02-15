# Hack The Tank - Backend API

A Professional Flask REST API with PostgreSQL (Supabase) and JWT Authentication for conference/event lead management.

## 🎯 Overview

This backend powers a dual-mode lead capture system for conferences and trade shows:

**Stall Mode (Kiosk/Booth):**
- Quick visitor entry with email and phone validation
- Real-time duplicate detection
- Offline-first frontend with background sync

**Field Mode (On-Floor Capture):**
- AI-powered business card scanning via Google Gemini  
- Audio note recording with Cloudinary storage
- Automatic extraction of contact details from card images
- Syncs captured data with image/audio URLs

## ✨ Key Features

- ✅ JWT-based authentication with role-based access (admin/agent)
- ✅ Organization multi-tenancy
- ✅ Tag system for lead qualification (15 predefined tags with scores)
- ✅ Interaction tracking with automatic lead ownership management
- ✅ Support for Cloudinary image/audio URLs (business cards, voice notes)
- ✅ Duplicate prevention (phone number per organization)
- ✅ State management (interaction → qualified → converted)
- ✅ Invite system for agent onboarding
- ✅ RESTful API design with comprehensive validation

## 🔧 Implementation Status (This Session)

**No code changes were made to the backend during this session.** The backend was already fully implemented and production-ready with all required endpoints and functionality.

### What Already Existed:
✅ **Authentication System** (`routes/auth_routes.py`, `services/auth.py`)
- User registration with organization creation
- JWT-based login
- Password hashing with bcrypt
- Role-based access control (admin/agent)

✅ **Interaction Endpoints** (`routes/interaction_routes.py`, `services/interaction.py`)
- `POST /api/interactions` - Create interaction with tags, images, audio URLs
- Support for `mode` field ("field" or "stall")
- Automatic lead creation if not exists
- Lead ownership management based on interaction scores
- Tag association and scoring

✅ **Data Models** (`models/`)
- User, Organization, Lead, Interaction, Tag, InteractionTag
- Proper foreign key relationships
- Unique constraints (phone per org, email per org)
- Timestamp tracking (created_at, updated_at)

✅ **Database Migrations** (`migrations/versions/`)
- Alembic migration scripts for schema changes
- Version control for database structure

✅ **Validation System** (`utils/validators.py`)
- Email format validation
- Phone number validation (10 digits)
- Name and organization name validation
- URL validation for image_url and audio_url fields

### What Was Updated:
📝 **Documentation Only** (README.md)
- Enhanced overview to describe Field vs Stall modes
- Updated interaction endpoint documentation:
  - Added `mode` field description ("field" | "stall")
  - Documented `image_url` and `audio_url` fields (Cloudinary URLs)
  - Updated phone validation (10 digits exactly)
  - Added notes about Gemini AI-generated remarks
  - Clarified email fallback handling (`xxx@temp.email` format)

### Frontend Integration Points:
The backend seamlessly accepts data from the frontend's Gemini AI pipeline:

**Request from Frontend:**
```json
{
  "name": "HARPER RUSSO",           // From Gemini extraction
  "mobNo": "1234567890",             // Cleaned by frontend (last 10 digits)
  "email": "1234567890@temp.email",  // Fallback if not on card
  "mode": "field",                   // Capture mode
  "image_url": "https://res.cloudinary.com/.../field_cards/xxx.jpg",  // Cloudinary URL
  "audio_url": "https://res.cloudinary.com/.../field_audio/xxx.webm", // Cloudinary URL
  "tagIds": [1, 2, 3],               // Selected tags
  "remarks": "General Manager. www.reallygreatsite.com. 123 Anywhere St."  // From Gemini
}
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "lead_id": 3,
    "agent_id": 5,
    "mode": "field",
    "remarks": "General Manager...",
    "image_url": "https://res.cloudinary.com/...",
    "audio_url": "https://res.cloudinary.com/...",
    "score": 15,
    "tags": [...]
  }
}
```

### Why No Backend Changes Were Needed:
The existing backend API was already designed to handle:
- Optional `image_url` and `audio_url` fields
- Variable phone number formats (validation accepts 10 digits)
- Optional email with no strict domain requirements
- Text-based `remarks` field of any length
- Tag arrays for lead qualification
- Mode differentiation for analytics

The frontend's Gemini AI integration and Cloudinary uploads work as **client-side enhancements** that feed structured data into the existing API contracts.

## Project Structure

```
backend/
├── app.py                  # Main Flask application
├── database.py            # SQLAlchemy database configuration
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── models/
│   ├── __init__.py
│   ├── user.py           # User model
│   ├── lead.py           # Lead model
│   ├── tag.py            # Tag model
│   └── user_tag.py       # UserTag model (junction table)
├── routes/
│   ├── __init__.py       # Routes registration
│   ├── basic_routes.py   # Health & welcome endpoints
│   └── auth_routes.py    # Authentication endpoints
├── services/
│   └── auth.py           # Auth business logic
└── utils/
    └── validators.py     # Input validation utilities
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- PostgreSQL (Supabase)

### Installation

1. **Clone and navigate to backend:**
```bash
cd backend
```

2. **Create and activate virtual environment:**
```bash
python -m venv venv
.\venv\scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**
Create a `.env` file:
```env
FLASK_ENV=development
FLASK_DEBUG=True
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.hinyiocfpoymedswlrro.supabase.co:5432/postgres
JWT_SECRET_KEY=your-secret-key-here-change-in-production
```

5. **Run the server:**
```bash
python app.py
```

Server runs on `http://localhost:5000`

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Common Response Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (Resource already exists)
- `500` - Internal Server Error

---

## Authentication Endpoints

### 1. Register User with Organization

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account with automatic organization and admin role assignment. User and organization creation is atomic - both succeed or both fail.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobNo": "+1234567890",
  "password": "SecurePassword123",
  "orgName": "Acme Corporation",
  "orgDescription": "Leading technology company",
  "orgWebsite": "https://acmecorp.com"
}
```

**Field Validation:**
- `name`: Required, 2-120 characters
- `email`: Required, valid email format, unique
- `mobNo`: Required, 7-20 characters (digits, +, -, (), spaces allowed)
- `password`: Required, minimum 6 characters
- `orgName`: Required, 2-120 characters
- `orgDescription`: Optional, maximum 1000 characters
- `orgWebsite`: Optional, valid URL format

**Success Response (201):**
```json
{
  "message": "User and organization created successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobno": "+1234567890",
    "orgId": 1,
    "role": "admin",
    "created_at": "2026-02-14T10:30:00",
    "updated_at": "2026-02-14T10:30:00"
  },
  "organization": {
    "id": 1,
    "name": "Acme Corporation",
    "description": "Leading technology company",
    "website": "https://acmecorp.com",
    "created_at": "2026-02-14T10:30:00",
    "updated_at": "2026-02-14T10:30:00"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields: orgName"
}
```

**Error Response (409):**
```json
{
  "error": "Email already registered"
}
```

**Error Cases:**
- Missing required fields → 400
- Invalid email format → 400
- Email already exists → 409
- Invalid phone format → 400
- Weak password → 400
- Invalid name format → 400
- Invalid organization name → 400
- Invalid website URL → 400
- Organization creation fails → 400 (user rollback is automatic)

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token for API access

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Field Validation:**
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobno": "+1234567890",
    "orgId": 1,
    "role": "admin",
    "created_at": "2026-02-14T10:30:00",
    "updated_at": "2026-02-14T10:30:00"
  },
  "organization": {
    "id": 1,
    "name": "Acme Corporation",
    "description": "Leading technology company",
    "website": "https://acmecorp.com",
    "created_at": "2026-02-14T10:30:00",
    "updated_at": "2026-02-14T10:30:00"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

**Error Cases:**
- Missing required fields → 400
- Invalid email format → 400
- User not found → 401
- Wrong password → 401

---

### 3. Invite Agent

**Endpoint:** `POST /api/auth/invite`

**Description:** Admin invites a new agent to join the organization. Agent is created without a password and receives an invite email with a verification token. Agent can then set their password using the invite token.

**Authorization:** Requires JWT token from admin user in Authorization header

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "agent_name": "Jane Smith",
  "agent_email": "jane@example.com",
  "agent_mobno": "+1234567890",
  "frontend_url": "https://app.example.com"
}
```

**Field Validation:**
- `agent_name`: Required, 2-120 characters
- `agent_email`: Required, valid email format, unique
- `agent_mobno`: Required, 7-20 characters (digits, +, -, (), spaces allowed)
- `frontend_url`: Required, used to construct invite link in email

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 2,
    "agent_name": "Jane Smith",
    "agent_email": "jane@example.com",
    "token_created_at": "2026-02-14T10:30:00",
    "token_expires_at": "2026-02-15T10:30:00",
    "message": "Invitation email sent successfully"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: agent_name"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "Only admins can invite agents"
}
```

**Error Response (409):**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- User is not admin → 403
- Missing required fields → 400
- Invalid email format → 400
- Invalid phone format → 400
- Email already registered → 409
- Email sending fails → 500

**Email Sent to Agent:**
- Subject: "You have been invited to join Hack The Tank"
- Contains: Agent name, welcome message, invitation link with token
- link expires in 24 hours

---

### 4. Set Password (Accept Invite)

**Endpoint:** `POST /api/auth/set-password`

**Description:** Agent accepts the invitation and sets their password. Returns JWT login token upon successful password setup.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "invite_token": "abc123...long_token_string...xyz",
  "password": "NewSecurePassword123"
}
```

**Field Validation:**
- `invite_token`: Required, must be valid and not expired
- `password`: Required, minimum 6 characters

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "mobno": "+1234567890",
      "role": "agent",
      "orgId": 1,
      "created_at": "2026-02-14T10:30:00",
      "updated_at": "2026-02-14T10:30:00"
    },
    "organization": {
      "id": 1,
      "name": "Acme Corporation",
      "description": "Leading technology company",
      "website": "https://acmecorp.com",
      "created_at": "2026-02-14T09:00:00",
      "updated_at": "2026-02-14T09:00:00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Password set successfully. You can now log in."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid invite token"
}
```

**Error Response (400 - Expired):**
```json
{
  "success": false,
  "error": "Invite token has expired or already used"
}
```

**Error Response (422 - Weak Password):**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters"
}
```

**Error Cases:**
- Missing required fields → 400
- Invalid invite token → 400
- Token has expired (24 hours) → 400
- Token already used → 400
- Weak password → 422
- User not found → 400

**Token Behavior:**
- Invite token is automatically marked as "used" after successful password setup
- Token expires 24 hours after creation
- Cannot reuse expired or already-used tokens
- Separate verification system from JWT login tokens

---

## 5. Add Interaction

**Endpoint:** `POST /api/interactions`

**Description:** Create a new interaction (lead capture) from either stall (kiosk/booth) or field (on-floor) mode. Creates lead if not exists, updates lead owner if new interaction score is higher. Interaction score is calculated from selected tags. Supports Cloudinary image and audio URLs for business cards and voice notes.

**Authorization:** Requires JWT token from authenticated user in Authorization header

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <agent_jwt_token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "mobNo": "1234567890",
  "email": "john@example.com",
  "mode": "field",
  "image_url": "https://res.cloudinary.com/xxx/image/upload/field_cards/xxx.jpg",
  "audio_url": "https://res.cloudinary.com/xxx/video/upload/field_audio/xxx.webm",
  "tagIds": [1, 2, 3],
  "remarks": "General Manager. www.reallygreatsite.com. 123 Anywhere St., Any City"
}
```

**Field Validation:**
- `name`: Required, 2-120 characters
- `mobNo`: Required, 10 digits exactly (cleaned phone number)
- `email`: Optional, valid email format (fallback emails like `1234567890@temp.email` are common for field captures)
- `mode`: Optional, either "field" or "stall" (default: "stall")
  - **field**: On-floor capture with business card scanning
  - **stall**: Kiosk/booth quick entry
- `image_url`: Optional, Cloudinary URL for uploaded business card image
- `audio_url`: Optional, Cloudinary URL for uploaded audio note
- `tagIds`: Required, non-empty array of tag IDs (1-15)
- `remarks`: Optional, text field (often populated by Gemini AI extraction from business cards)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "lead_id": 3,
    "agent_id": 5,
    "mode": "field",
    "remarks": "Customer showed interest in product",
    "audio_note_url": "https://example.com/audio.mp3",
    "image_url": "https://example.com/image.jpg",
    "score": 15,
    "tags": [
      {
        "id": 1,
        "tag_id": 1,
        "tag": {
          "id": 1,
          "text": "Interested",
          "color": "green",
          "score": 5
        },
        "created_at": "2026-02-14T10:30:00"
      }
    ],
    "created_at": "2026-02-14T10:30:00"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: tagIds"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "One or more tag IDs are invalid"
}
```

**Success Response with Owner Not Changed (200):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "lead_id": 3,
    "agent_id": 5,
    "mode": "field",
    "remarks": "Customer showed interest in product",
    "audio_note_url": "https://example.com/audio.mp3",
    "image_url": "https://example.com/image.jpg",
    "score": 15,
    "tags": [...],
    "created_at": "2026-02-14T10:30:00",
    "message": "Interaction added successfully. Lead state is qualified, owner cannot be changed."
  }
}
```

**Behavior Logic:**

1. **Lead Does Not Exist:**
   - Creates new lead with ownerId=agentId
   - Sets state='interaction'
   - Creates interaction with calculated score from tags
   - Adds interaction tags

2. **Lead Exists with state='interaction':**
   - Fetches previous interaction from same owner
   - Calculates new score from selected tags
   - If new score > (previous score + 5): Updates lead owner to current agentId
   - Creates interaction

3. **Lead Exists with state == 'interaction' and userId != ownerId:**
   - Updates the latest interaction with provided fields (tagIds, image_url, audio_url, remarks)
   - Only updates score if tagIds are provided
   - Other fields updated only if present in request
   - No new interaction created, existing one is modified

4. **Lead Exists with state != 'interaction':**
   - Creates interaction anyway (does not throw error)
   - Adds interaction tags
   - Returns interaction data with message indicating owner cannot be changed
   - **No lead owner update** (state is locked)

**Score Calculation:**
- Score = Sum of selected tag scores
- Example: If tags [1, 2, 3] have scores [5, 7, 3], total score = 15
- Lead owner changes only if new score exceeds previous score + 5

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- Missing required fields → 400
- Invalid email format → 400
- Invalid phone format → 400
- Invalid tag IDs → 404
- Server error → 500

---

### 6. Get All Leads

**Endpoint:** `GET /api/interactions/leads`

**Description:** Retrieve all leads based on user role. Agents see only their owned leads, admins see all organization leads.

**Authorization:** Requires JWT token in Authorization header

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "mobNo": "+1234567890",
      "ownerId": 5,
      "orgId": 1,
      "state": "INTERACTION",
      "created_at": "2026-02-14T10:30:00",
      "updated_at": "2026-02-14T10:30:00",
      "interaction": {
        "id": 1,
        "lead_id": 1,
        "agent_id": 5,
        "mode": "field",
        "remarks": "Customer interested",
        "audio_note_url": "https://...",
        "image_url": "https://...",
        "score": 12,
        "tags": [
          {
            "id": 1,
            "tag_id": 1,
            "tag": {
              "id": 1,
              "text": "Interested",
              "color": "green",
              "score": 5
            },
            "created_at": "2026-02-14T10:30:00"
          }
        ],
        "created_at": "2026-02-14T10:30:00"
      }
    }
  ]
}
```

**Role-based Behavior:**
- **Agent:** Returns only leads assigned to them (ownerId = agent.id)
- **Admin:** Returns all leads in their organization (orgId = agent.orgId)

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- Server error → 500

---

### 7. Get All Interactions

**Endpoint:** `GET /api/interactions/all`

**Description:** Retrieve all interactions based on user role. Agents see only their own interactions, admins see all organization interactions.

**Authorization:** Requires JWT token in Authorization header

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "lead_id": 1,
      "agent_id": 5,
      "mode": "field",
      "remarks": "Customer interested",
      "audio_note_url": "https://...",
      "image_url": "https://...",
      "score": 15,
      "tags": [
        {
          "id": 1,
          "tag_id": 1,
          "tag": {
            "id": 1,
            "text": "Interested",
            "color": "green",
            "score": 5
          },
          "created_at": "2026-02-14T10:30:00"
        },
        {
          "id": 2,
          "tag_id": 2,
          "tag": {
            "id": 2,
            "text": "Qualified",
            "color": "blue",
            "score": 10
          },
          "created_at": "2026-02-14T10:30:00"
        }
      ],
      "created_at": "2026-02-14T10:30:00"
    }
  ]
}
```

**Role-based Behavior:**
- **Agent:** Returns only their own interactions (agent_id = user.id)
- **Admin:** Returns all interactions in their organization (joined with leads where orgId = admin.orgId)

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- Server error → 500

---

## Basic Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Description:** Check API and database health status

**Request Headers:**
```
None required
```

**Success Response (200):**
```json
{
  "status": "healthy",
  "message": "Backend is running",
  "database": "connected"
}
```

**Error Response (500):**
```json
{
  "status": "unhealthy",
  "message": "Database connection failed: error details"
}
```

---

### 2. Welcome Endpoint

**Endpoint:** `GET /`

**Description:** Welcome message

**Response (200):**
```json
{
  "message": "Welcome to Hack The Tank Backend"
}
```

---

## JWT Token Usage

After successful login/registration, include the token in all protected requests:

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Details:**
- Algorithm: HS256
- Expiration: 30 days from issuance
- Payload: `user_id`, `iat` (issued at), `exp` (expiration)

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE INDEX,
  mobno VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Leads Table
```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  mobNo VARCHAR(20) NOT NULL,
  remarks TEXT,
  ownerId INTEGER NOT NULL FOREIGN KEY REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tags Table
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  text VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### UserTags Table (Junction)
```sql
CREATE TABLE user_tags (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  tagid INTEGER NOT NULL FOREIGN KEY REFERENCES tags(id),
  leadid INTEGER NOT NULL FOREIGN KEY REFERENCES leads(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security Features

1. **Password Security:**
   - Bcrypt hashing with 10-round salt
   - Minimum 6 characters required
   - Proper verification during login

2. **JWT Authentication:**
   - HS256 algorithm
   - 30-day expiration
   - Secure token generation and validation

3. **Input Validation:**
   - Type checking
   - Length validation
   - Format validation (email, phone)
   - SQL injection prevention via ORM

4. **Email Security:**
   - Unique constraint
   - Lowercase normalization
   - Format validation

5. **Error Handling:**
   - Generic error messages to prevent info leakage
   - Proper HTTP status codes
   - No stack traces in production

---

## 8. Get Agents for a Lead

**Endpoint:** `GET /api/interactions/leads/{lead_id}/agents`

**Description:** Get all agents who have interacted with a lead. Returns agent details for dropdown display. Admin only.

**Authorization:** Requires admin JWT token in Authorization header

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "mobno": "+1234567890",
      "role": "agent"
    },
    {
      "id": 6,
      "name": "John Johnson",
      "email": "john@example.com",
      "mobno": "+0987654321",
      "role": "agent"
    }
  ]
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "Only admins can view agents for a lead"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Lead not found"
}
```

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- User is not admin → 403
- Lead not found → 404
- Lead from different organization → 404
- Server error → 500

---

## 9. Change Lead Owner

**Endpoint:** `PUT /api/interactions/leads/{lead_id}/owner`

**Description:** Change the owner (assigned agent) of a lead. Admin only.

**Authorization:** Requires admin JWT token in Authorization header

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "new_owner_id": 5
}
```

**Field Validation:**
- `new_owner_id`: Required, must be a valid user ID in the same organization

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobNo": "+1234567890",
    "ownerId": 5,
    "orgId": 1,
    "state": "INTERACTION",
    "created_at": "2026-02-14T10:30:00",
    "updated_at": "2026-02-15T14:45:30"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required field: new_owner_id"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "Only admins can change lead owner"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Lead not found"
}
```

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- User is not admin → 403
- Missing new_owner_id → 400
- New owner user not found → 404
- New owner from different organization → 404
- Lead not found → 404
- Lead from different organization → 404
- Server error → 500

---

## 10. Change Lead State

**Endpoint:** `PUT /api/interactions/leads/{lead_id}/state`

**Description:** Change the state of a lead. Accessible to admins or the lead owner. State must be a valid LeadState enum value.

**Authorization:** Requires JWT token in Authorization header (admin or lead owner)

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "state": "FOLLOW_UP"
}
```

**Valid States:**
- INTERACTION
- FOLLOW_UP
- ENGAGED
- MEETING
- OUTCOME
- CLOSED

**Field Validation:**
- `state`: Required, must be one of the valid states (case-insensitive)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobNo": "+1234567890",
    "ownerId": 5,
    "orgId": 1,
    "state": "FOLLOW_UP",
    "created_at": "2026-02-14T10:30:00",
    "updated_at": "2026-02-15T15:00:00"
  }
}
```

**Error Response (400 - Invalid State):**
```json
{
  "success": false,
  "error": "Invalid state 'INVALID_STATE'. Allowed states: INTERACTION, FOLLOW_UP, ENGAGED, MEETING, OUTCOME, CLOSED"
}
```

**Error Response (403 - Permission Denied):**
```json
{
  "success": false,
  "error": "Only admins or lead owner can change lead state"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Lead not found"
}
```

**Error Cases:**
- Missing authorization token → 401
- Invalid JWT token → 401
- User is not admin and not lead owner → 403
- Missing state field → 400
- Invalid state value → 400 (with allowed states listed)
- Lead not found → 404
- Lead from different organization → 404
- Missing state field → 400
- Invalid state value → 400 (with allowed states listed)
- Lead not found → 404
- Lead from different organization → 404
- Server error → 500

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobNo": "+1234567890",
    "password": "SecurePassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Add Interaction
```bash
curl -X POST http://localhost:5000/api/interactions \
  -H "Authorization: Bearer <agent_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "mobNo": "+1234567890",
    "email": "john@example.com",
    "tagIds": [1, 2, 3],
    "remarks": "Customer interested",
    "image_url": "https://example.com/image.jpg"
  }'
```

---

## Technologies Used

- **Framework:** Flask 3.0.0
- **ORM:** SQLAlchemy 2.0.23
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** JWT (PyJWT 2.11.0)
- **Password Hashing:** Bcrypt 4.1.2
- **CORS:** Flask-CORS 4.0.0

---

## Development Notes

### Project Architecture
- **Models:** Define database schema with proper relationships
- **Services:** Business logic separated from routes
- **Routes:** Organized by feature in separate blueprint files
- **Utils:** Reusable validation functions
- **Database:** Centralized configuration to prevent circular imports

### Next Steps
- Create User CRUD routes
- Create Lead CRUD routes
- Create Tag management routes
- Create UserTag association routes
- Add route protection with JWT middleware
- Add pagination and filtering
- Create comprehensive test suite

---

## Support

For issues or questions, please create an issue in the repository.
