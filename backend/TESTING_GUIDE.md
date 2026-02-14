# Invite System - Testing Guide

## Quick Start

### 1. Run the Flask Server
```bash
cd backend
python app.py
```

The server will start on `http://localhost:5000`

## Testing the Complete Workflow

### Step 1: Admin Registration
Create an admin account first:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "mobNo": "+1234567890",
    "password": "AdminPassword123",
    "orgName": "My Company",
    "orgDescription": "Company Description",
    "orgWebsite": "https://company.com"
  }'
```

**Response (200):**
```json
{
  "message": "User and organization created successfully",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "orgId": 1
  },
  "organization": {
    "id": 1,
    "name": "My Company"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Save the token for the next step** - You'll use this to authenticate the invite request.

---

### Step 2: Admin Invites Agent
Use the token from Step 1 in the Authorization header:
```bash
curl -X POST http://localhost:5000/api/auth/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_from_step_1>" \
  -d '{
    "agent_name": "Jane Smith",
    "agent_email": "jane@example.com",
    "agent_mobno": "+1234567890",
    "frontend_url": "http://localhost:3000"
  }'
```

**Expected Status:** 200

**Response:**
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

**What happens in the background:**
- Agent user is created without a password (in `agents` role)
- InviteToken is generated (24-hour expiry)
- Email is sent to jane@example.com with the invite link
- Email contains: `http://localhost:3000/accept-invite?token=<token>`

---

### Step 3: Agent Sets Password
In a real scenario, the agent clicks the link in their email. For testing, extract the token and send a request:

**Get the invite token from database (for testing):**
```bash
# This would be programmatic in the real flow
# For testing, you'd get the token from the email or database
```

**Agent sets password:**
```bash
curl -X POST http://localhost:5000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "invite_token": "<token_from_email>",
    "password": "AgentPassword123"
  }'
```

**Expected Status:** 200

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "agent",
      "orgId": 1
    },
    "organization": {
      "id": 1,
      "name": "My Company"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "message": "Password set successfully. You can now log in."
  }
}
```

**What happens:**
- InviteToken is validated (not expired, not already used)
- Agent password is set with bcrypt hashing
- InviteToken is marked as "used"
- JWT login token is returned

---

### Step 4: Agent Logs In
Now the agent can log in normally:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "AgentPassword123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "agent",
    "orgId": 1
  },
  "organization": {
    "id": 1,
    "name": "My Company"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Error Cases

### Invalid Admin Token
```bash
curl -X POST http://localhost:5000/api/auth/invite \
  -H "Authorization: Bearer invalid_token" \
  -d '{...}'
```
**Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Non-Admin User Tries to Invite
```bash
# Use an agent's token (not admin)
curl -X POST http://localhost:5000/api/auth/invite \
  -H "Authorization: Bearer <agent_token>" \
  -d '{...}'
```
**Response (403):**
```json
{
  "success": false,
  "error": "Only admins can invite agents"
}
```

### Email Already Registered
```bash
curl -X POST http://localhost:5000/api/auth/invite \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "agent_name": "Jane Smith",
    "agent_email": "admin@example.com",  # Already used!
    "agent_mobno": "+1234567890",
    "frontend_url": "http://localhost:3000"
  }'
```
**Response (409):**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

### Expired Invite Token
```bash
# If token has expired (24+ hours old)
curl -X POST http://localhost:5000/api/auth/set-password \
  -d '{
    "invite_token": "<expired_token>",
    "password": "NewPassword123"
  }'
```
**Response (400):**
```json
{
  "success": false,
  "error": "Invite token has expired or already used"
}
```

### Already Used Token
```bash
# If you try to use the same invite token twice
curl -X POST http://localhost:5000/api/auth/set-password \
  -d '{
    "invite_token": "<already_used_token>",
    "password": "NewPassword123"
  }'
```
**Response (400):**
```json
{
  "success": false,
  "error": "Invite token has expired or already used"
}
```

### Weak Password
```bash
curl -X POST http://localhost:5000/api/auth/set-password \
  -d '{
    "invite_token": "<valid_token>",
    "password": "weak"  # Less than 6 characters
  }'
```
**Response (422):**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters"
}
```

---

## Email Configuration Testing

### Gmail SMTP Troubleshooting

1. **Verify .env variables are set:**
   ```bash
   # In .env file, check:
   EMAIL=your-gmail@gmail.com
   APP_PASSWORD=your-16-char-app-password
   ```

2. **Test email sending directly:**
   ```python
   from services.email import email_service
   
   success, error = email_service.send_email(
       recipient_email="test@example.com",
       subject="Test Email",
       html_body="<h1>Test</h1>"
   )
   
   if success:
       print("Email sent successfully")
   else:
       print(f"Email failed: {error}")
   ```

3. **Common Gmail Issues:**
   - App password is 16 characters (not your Gmail password)
   - Enable "Allow less secure app access" if password auth fails
   - Check Gmail's App Passwords in security settings
   - Verify the email account is not restricted

---

## Database Verification

### Check Invite Tokens
```python
from app import app, db
from models import InviteToken

with app.app_context():
    tokens = InviteToken.query.all()
    for token in tokens:
        print(f"Token: {token.token[:20]}...")
        print(f"User: {token.user.name}")
        print(f"Expires: {token.expires_at}")
        print(f"Used: {token.used}")
        print()
```

### Check Users by Organization
```python
from app import app, db
from models import User, Organization

with app.app_context():
    org = Organization.query.first()
    users = User.query.filter_by(orgId=org.id).all()
    for user in users:
        print(f"{user.name} ({user.email}) - Role: {user.role}")
```

---

## Frontend Integration

### From the frontend, the flow is:

1. **Login page** → User logs in as admin
2. **Admin dashboard** → Click "Invite Agent"
3. **Invite form** → Fill agent details, click "Send Invite"
   ```javascript
   // Send invite request
   fetch('/api/auth/invite', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${adminToken}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       agent_name: formData.name,
       agent_email: formData.email,
       agent_mobno: formData.phone,
       frontend_url: window.location.origin
     })
   })
   ```

4. **Agent receives email** → Clicks invite link with token
5. **Set Password page** → `?token=<token>` in URL
   ```javascript
   // Extract token from URL
   const params = new URLSearchParams(window.location.search);
   const token = params.get('token');
   
   // Submit password
   fetch('/api/auth/set-password', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       invite_token: token,
       password: formData.password
     })
   })
   ```

6. **Login page** → Agent redirected, logs in with new credentials

---

## Performance Notes

- Invite token generation uses `secrets.token_urlsafe()` for cryptographic randomness
- Emails are sent synchronously (consider async queue for production)
- InviteToken table has index on `token` for fast lookups
- All invite operations are transaction-protected

---

## Security Checklist

- [x] Invite tokens have 24-hour expiry
- [x] Tokens can only be used once
- [x] Password hashing with bcrypt (4.1.2)
- [x] Separate token secret from JWT secret
- [x] Admin authorization check before inviting
- [x] Email uniqueness validation
- [x] Input validation on all fields
- [x] Proper HTTP status codes
- [x] No stack traces in error messages
- [x] Atomic transactions (all-or-nothing)
