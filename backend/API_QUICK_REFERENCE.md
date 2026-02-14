# Invite System API Quick Reference

## Endpoints Summary

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/invite` | JWT (Admin) | Create agent invite |
| POST | `/api/auth/set-password` | None | Agent sets password |

---

## 1. Invite Agent

```
POST /api/auth/invite
```

### Request
```json
{
  "agent_name": "Jane Smith",
  "agent_email": "jane@example.com",
  "agent_mobno": "+1234567890",
  "frontend_url": "https://app.example.com"
}
```

### Headers
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

### Response (200)
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

### Error Responses

**400 - Missing Fields**
```json
{
  "success": false,
  "error": "Missing required fields: agent_name"
}
```

**401 - Invalid Token**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**403 - Not Admin**
```json
{
  "success": false,
  "error": "Only admins can invite agents"
}
```

**409 - Email Exists**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

**500 - Email Error**
```json
{
  "success": false,
  "error": "Failed to send email: <error_details>"
}
```

---

## 2. Set Password

```
POST /api/auth/set-password
```

### Request
```json
{
  "invite_token": "abc123...long_token...xyz",
  "password": "NewPassword123"
}
```

### Headers
```
Content-Type: application/json
```

### Response (200)
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
      "name": "My Company",
      "description": "Company Description",
      "website": "https://example.com",
      "created_at": "2026-02-14T09:00:00",
      "updated_at": "2026-02-14T09:00:00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Password set successfully. You can now log in."
  }
}
```

### Error Responses

**400 - Invalid Token**
```json
{
  "success": false,
  "error": "Invalid invite token"
}
```

**400 - Expired Token**
```json
{
  "success": false,
  "error": "Invite token has expired or already used"
}
```

**422 - Weak Password**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters"
}
```

---

## Field Validation Rules

### Invite Endpoint
| Field | Type | Rules |
|-------|------|-------|
| agent_name | String | Required, 2-120 characters |
| agent_email | String | Required, valid email, unique |
| agent_mobno | String | Required, 7-20 chars, digits/+/-/()/space |
| frontend_url | String | Required, used to build invite link |

### Set Password Endpoint
| Field | Type | Rules |
|-------|------|-------|
| invite_token | String | Required, valid and not expired |
| password | String | Required, minimum 6 characters |

---

## Session Data Flow

### Invite Flow
```
Admin JWT Token
    ↓
POST /api/auth/invite
    ↓ (Server validates admin)
    ↓ (Server creates User + InviteToken)
    ↓ (Server sends email)
Success Response
    ↓
Email sent to agent@example.com
```

### Set Password Flow
```
Email from inbox
    ↓ (Agent clicks link with token)
POST /api/auth/set-password
    ↓ (Server validates token)
    ↓ (Server sets password)
    ↓ (Server marks token used)
JWT Login Token returned
    ↓
Agent uses token to login
```

---

## cURL Examples

### Invite Agent
```bash
curl -X POST http://localhost:5000/api/auth/invite \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "Jane Smith",
    "agent_email": "jane@example.com",
    "agent_mobno": "+1234567890",
    "frontend_url": "http://localhost:3000"
  }'
```

### Set Password
```bash
curl -X POST http://localhost:5000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "invite_token": "token_from_email",
    "password": "NewPassword123"
  }'
```

---

## Token Details

### JWT Token (Login)
- **Algorithm:** HS256
- **Expiry:** 30 days
- **Secret:** JWT_SECRET_KEY from .env
- **Payload:** user_id, iat, exp
- **Used For:** API authentication

### Invite Token (Email Verification)
- **Algorithm:** URL-safe Base64
- **Expiry:** 24 hours
- **Secret:** Cryptographically random (secrets module)
- **Used For:** One-time email link verification
- **Single Use:** Token marked "used" after password set

---

## Status Code Reference

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request processed successfully |
| 400 | Bad Request | Invalid input, expired token, validation error |
| 401 | Unauthorized | Missing token, invalid token |
| 403 | Forbidden | User not authorized (not admin) |
| 409 | Conflict | Email already exists |
| 422 | Unprocessable | Validation error (weak password) |
| 500 | Server Error | Email sending failed, DB error |

---

## Email Template

The invite email includes:
- Subject: "You have been invited to join Hack The Tank"
- Welcome message with agent name
- Invitation link with token: `{frontend_url}/accept-invite?token={token}`
- 24-hour expiry warning
- Organization context
- Support contact info

---

## Database Schema

### invite_tokens Table
```sql
id                INTEGER PRIMARY KEY
token             VARCHAR(255) UNIQUE NOT NULL
user_id           INTEGER FK users(id) ON DELETE CASCADE
org_id            INTEGER FK organizations(id) ON DELETE CASCADE
created_at        TIMESTAMP DEFAULT NOW()
expires_at        TIMESTAMP NOT NULL
used              BOOLEAN DEFAULT FALSE
used_at           TIMESTAMP NULL

INDEX: idx_invite_tokens_token (token)
```

### Users Table Updates
```sql
-- Added columns:
password_hash     VARCHAR(255) NULL  -- Nullable for invited users
orgId             INTEGER FK organizations(id) ON DELETE CASCADE
```

---

## Error Handling Best Practices

1. **Check Status Code First**
   ```javascript
   if (response.status === 200) {
     // Success
   } else if (response.status === 401) {
     // Auth error - redirect to login
   } else if (response.status === 403) {
     // Permission denied
   }
   ```

2. **Show User Friendly Messages**
   - API error: "Invalid or expired token"
   - Show to user: "This invite link has expired. Please ask admin for new invite."

3. **Log Server Errors**
   - Status 500: Log full response, show generic message

---

## Rate Limiting Recommendations

Consider implementing:
- `/api/auth/invite` - 10 requests per hour per admin
- `/api/auth/set-password` - 5 requests per IP per hour (prevent brute force)

---

## Security Recommendations

1. **Production Checklist**
   - [ ] Use strong JWT_SECRET_KEY (32+ characters)
   - [ ] Enable HTTPS (TLS required for email)
   - [ ] Rate limit invite endpoints
   - [ ] Log all invite actions for audit
   - [ ] Monitor email sending failures
   - [ ] Implement CSRF protection on forms
   - [ ] Sanitize email addresses

2. **Monitoring**
   - Alert on failed email sends
   - Alert on too many failed set-password attempts
   - Track invite acceptance rate
   - Monitor for duplicate email attempts

---

**Last Updated:** February 14, 2026
**Status:** Production Ready
