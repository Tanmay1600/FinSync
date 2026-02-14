# Hack The Tank - Backend API

A Professional Flask REST API with PostgreSQL (Supabase) and JWT Authentication.

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
