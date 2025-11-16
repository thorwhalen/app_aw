# Authentication Guide

This guide covers authentication in the AW App, including dev mode for easy testing and production setup.

## Quick Start (Developer Mode)

The easiest way to get started is using **Dev Login** which automatically creates a test user.

### Using Dev Login (Frontend)

1. Start the application
2. You'll see a login screen
3. Click **"🚀 Quick Dev Login"** button
4. You're automatically logged in as the `dev` user

**Dev User Credentials:**
- Username: `dev`
- Email: `dev@example.com`
- Password: `dev`
- Scopes: `read`, `write`, `admin` (superuser)

### Using Dev Login (API)

```bash
curl -X POST http://localhost:8000/api/v1/auth/dev-login
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## Authentication Flow

### 1. Register New User

**Frontend:**
Click "Register here" on the login screen and fill out the form.

**API:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "securepass123",
    "full_name": "Alice Smith"
  }'
```

**Response:**
```json
{
  "id": "uuid-here",
  "username": "alice",
  "email": "alice@example.com",
  "full_name": "Alice Smith",
  "is_active": true,
  "is_superuser": false,
  "scopes": ["read", "write"],
  "created_at": "2025-01-16T12:00:00Z"
}
```

After registration, you're automatically logged in.

### 2. Login

**Frontend:**
Enter username/email and password on the login screen.

**API:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "securepass123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 3. Using Access Token

Include the access token in the `Authorization` header:

```bash
curl -X GET http://localhost:8000/api/v1/workflows \
  -H "Authorization: Bearer <access_token>"
```

The frontend automatically handles this for you.

### 4. Refresh Token

Access tokens expire after 30 minutes. Use the refresh token to get a new one:

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

The frontend automatically refreshes tokens every 25 minutes.

### 5. Get Current User

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### 6. Logout

**Frontend:**
Click the "Logout" button in the sidebar.

**API:**
Simply discard the tokens. There's no server-side logout endpoint (tokens are stateless JWT).

## Security Configuration

### JWT Secret Key

**⚠️ IMPORTANT**: Change the default JWT secret key in production!

**Development** (default):
```bash
JWT_SECRET_KEY=dev-secret-key-change-in-production-please
```

**Production**:
```bash
# Generate a secure random key
JWT_SECRET_KEY=$(openssl rand -hex 32)
```

Or set in `.env`:
```
JWT_SECRET_KEY=your-very-secure-random-key-here
```

### Token Expiration

Configure token lifetimes via environment variables:

```bash
ACCESS_TOKEN_EXPIRE_MINUTES=30  # Default: 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS=7      # Default: 7 days
```

### Password Requirements

- Minimum 8 characters
- No complexity requirements (can be added in `UserCreate` schema)

## User Scopes & Permissions

Users have a `scopes` array defining their permissions:

**Available Scopes:**
- `read`: Read access to resources
- `write`: Create/update resources
- `admin`: Administrative access

**Default for new users:**
```python
scopes = ["read", "write"]
```

**Dev user (superuser):**
```python
scopes = ["read", "write", "admin"]
is_superuser = True
```

### Checking Scopes (Backend)

Use the `require_scope` dependency:

```python
from app.dependencies.auth import require_scope

@router.delete("/workflows/{id}", dependencies=[Depends(require_scope("admin"))])
async def delete_workflow(id: str):
    # Only users with "admin" scope can access this
    pass
```

## Authentication Dependencies (Backend)

Several auth dependencies are available:

```python
from app.dependencies.auth import (
    CurrentUser,           # Require authentication
    CurrentUserOptional,   # Optional authentication
    CurrentUserDevMode,    # Bypass auth in debug mode
    CurrentSuperuser,      # Require superuser
    require_scope,         # Require specific scope
)
```

### Examples

**Require Authentication:**
```python
@router.get("/workflows")
async def get_workflows(current_user: CurrentUser):
    # current_user is guaranteed to be authenticated
    return await get_user_workflows(current_user.id)
```

**Optional Authentication:**
```python
@router.get("/public")
async def public_endpoint(current_user: CurrentUserOptional):
    if current_user:
        # Show personalized content
        return {"message": f"Hello {current_user.username}"}
    else:
        # Show public content
        return {"message": "Hello guest"}
```

**Dev Mode Bypass:**
```python
@router.get("/data")
async def get_data(current_user: CurrentUserDevMode):
    # In production: requires authentication
    # In development (DEBUG=true): bypasses auth (current_user is None)
    if current_user:
        return f"Data for {current_user.username}"
    else:
        return "Data (no auth required in dev mode)"
```

**Require Superuser:**
```python
@router.delete("/users/{id}")
async def delete_user(id: str, current_user: CurrentSuperuser):
    # Only superusers can access this
    await delete_user_by_id(id)
```

**Require Specific Scope:**
```python
@router.post(
    "/admin/settings",
    dependencies=[Depends(require_scope("admin"))]
)
async def update_settings(settings: dict):
    # Only users with "admin" scope can access
    pass
```

## Frontend Authentication

### Using Auth Context

```tsx
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout, devLogin } = useAuth()

  if (!isAuthenticated) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <p>Welcome {user.username}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Auth Context API

```tsx
const {
  user,              // Current user object (or null)
  token,             // Current access token (or null)
  isAuthenticated,   // Boolean: whether user is logged in
  isLoading,         // Boolean: whether auth is loading
  login,             // (username, password) => Promise<void>
  register,          // (username, email, password, fullName?) => Promise<void>
  devLogin,          // () => Promise<void>
  logout,            // () => void
  refreshToken,      // () => Promise<void>
} = useAuth()
```

### Auto Token Refresh

Tokens are automatically refreshed every 25 minutes (before the 30-minute expiration).

If refresh fails, the user is automatically logged out.

## Disabling Authentication (Development)

### Option 1: Use Dev Login

Simply click "Quick Dev Login" - no credentials needed.

### Option 2: Bypass Auth in Specific Endpoints

Use `CurrentUserDevMode` dependency in backend:

```python
@router.get("/data", dependencies=[Depends(get_current_user_dev_mode)])
async def get_data():
    # No auth required when DEBUG=true
    pass
```

Set in `.env`:
```
DEBUG=true
```

## Production Setup

### 1. Set Strong JWT Secret

```bash
# Generate secure key
openssl rand -hex 32

# Set in environment
export JWT_SECRET_KEY=<generated-key>
```

### 2. Disable Dev Login

While dev-login endpoint exists in production, it's clearly marked and should be monitored.

**Best Practice**: Remove `/auth/dev-login` endpoint from production builds or add authentication to it.

### 3. Use HTTPS

Always use HTTPS in production to protect tokens in transit.

### 4. Enable Database Migrations

Create user tables:

```bash
cd backend
alembic revision --autogenerate -m "Add user authentication tables"
alembic upgrade head
```

### 5. Set Up First Admin User

```bash
# Option 1: Use dev-login endpoint once to create dev user
curl -X POST https://your-domain.com/api/v1/auth/dev-login

# Option 2: Register via API and manually set is_superuser in database
curl -X POST https://your-domain.com/api/v1/auth/register -d '{...}'

# Then update in database:
UPDATE users SET is_superuser = true WHERE username = 'admin';
```

## Token Storage

### Frontend

Tokens are stored in `localStorage`:
- `aw_access_token`: Access token
- `aw_refresh_token`: Refresh token

**Security Note**: `localStorage` is vulnerable to XSS attacks. In production, consider using:
- `httpOnly` cookies (requires backend changes)
- Secure token storage libraries

### Backend

Tokens are **stateless JWT** - not stored server-side.

**Implications:**
- ✅ Scalable (no session storage needed)
- ✅ Works across multiple servers
- ❌ Cannot revoke tokens before expiration
- ❌ Logout is client-side only

For token revocation, you would need to implement:
- Token blacklist (Redis)
- Shorter token expiration times
- Regular token rotation

## API Testing with Authentication

### Using cURL

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/dev-login \
  | jq -r '.access_token')

# 2. Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/workflows
```

### Using httpie

```bash
# 1. Login
http POST :8000/api/v1/auth/dev-login

# 2. Use token
http :8000/api/v1/workflows \
  Authorization:"Bearer <token>"
```

### Using Postman

1. Send request to `/api/v1/auth/dev-login`
2. Copy `access_token` from response
3. In other requests, add header:
   - Key: `Authorization`
   - Value: `Bearer <access_token>`

Or use Postman's Authorization tab:
- Type: Bearer Token
- Token: `<access_token>`

## Troubleshooting

### "Not authenticated" Error

**Cause**: Missing or invalid access token

**Solutions:**
1. Ensure you're logged in
2. Check token is included in Authorization header
3. Token may have expired - refresh or login again

### "User not found" Error

**Cause**: User ID in token doesn't exist in database

**Solutions:**
1. Database was reset but tokens still exist
2. Clear localStorage and login again
3. Run database migrations

### Dev Login Not Working

**Cause**: Database connection issue or migration not run

**Solutions:**
1. Check database is running
2. Run migrations: `alembic upgrade head`
3. Check backend logs for errors

### Tokens Not Persisting

**Cause**: localStorage not working or being cleared

**Solutions:**
1. Check browser console for errors
2. Ensure cookies/localStorage are enabled
3. Check for browser extensions blocking storage

## Security Best Practices

1. **✅ DO**: Use HTTPS in production
2. **✅ DO**: Set strong JWT secret key
3. **✅ DO**: Use short token expiration times
4. **✅ DO**: Implement rate limiting on auth endpoints
5. **✅ DO**: Log authentication events
6. **✅ DO**: Use password hashing (bcrypt - already implemented)

7. **❌ DON'T**: Expose JWT secret in client code
8. **❌ DON'T**: Store passwords in plain text
9. **❌ DON'T**: Use predictable user IDs
10. **❌ DON'T**: Skip HTTPS in production

## Future Enhancements

Potential improvements for production:

1. **OAuth2 Providers**: Google, GitHub login
2. **MFA**: Two-factor authentication
3. **Password Reset**: Email-based password recovery
4. **Email Verification**: Verify email on registration
5. **Token Blacklist**: Revoke tokens before expiration
6. **Session Management**: View and revoke active sessions
7. **Audit Logging**: Track all authentication events
8. **Rate Limiting**: Prevent brute force attacks
9. **CAPTCHA**: On registration/login
10. **Account Lockout**: After failed login attempts

---

## Quick Reference

**Dev Login (fastest):**
```bash
# Frontend: Click "🚀 Quick Dev Login"

# API:
curl -X POST http://localhost:8000/api/v1/auth/dev-login
```

**Register:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"password123"}'
```

**Use Token:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/workflows
```

For more details, see the API documentation at `/docs` (Swagger UI).
