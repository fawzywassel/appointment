# Local Authentication

This application now supports both SSO authentication and local username/password authentication.

## Endpoints

### Register a New User
```http
POST /auth/local/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "your-password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ATTENDEE"
  }
}
```

### Login with Email and Password
```http
POST /auth/local/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ATTENDEE"
  }
}
```

### Get Current User (Protected)
```http
GET /auth/me
Authorization: Bearer <accessToken>
```

## Implementation Details

- Passwords are hashed using bcrypt with 10 salt rounds
- Minimum password length is 6 characters
- Password field in database is optional to support both SSO and local auth
- JWT tokens are used for session management (7 days expiration by default)
- New users registered via local auth are assigned the "ATTENDEE" role by default

## Database Migration

After updating the schema, run the migration:

```bash
cd backend
npx prisma migrate dev --name add_password_field
```

Or if Docker isn't running yet, just generate the Prisma client:

```bash
npx prisma generate
```

Then when you start the database, run:

```bash
# From project root
docker-compose up -d

# Then run migration
cd backend
npx prisma migrate dev
```

## Security Notes

- Always use HTTPS in production
- Store JWT_SECRET securely (use environment variables)
- Consider implementing rate limiting on auth endpoints
- Add password strength requirements as needed
- Consider adding email verification for new registrations
