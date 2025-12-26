# Quick Start Guide

## ✓ Setup Complete!

Your appointment scheduling application is now configured with:
- ✅ Local PostgreSQL database connected
- ✅ All tables created and migrated
- ✅ Local username/password authentication added
- ✅ Environment variables configured

## Start the Application

### 1. Start the Backend Server
```bash
cd backend
npm run start:dev
```

The server will start on **http://localhost:3001**

### 2. Test the Authentication

Once the server is running, test the local authentication:

```bash
cd backend
./test-local-auth.sh
```

Or manually test with curl:

#### Register a new user
```bash
curl -X POST http://localhost:3001/auth/local/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "password": "password123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/auth/local/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## View Your Database

### Option 1: Prisma Studio (Recommended - GUI)
```bash
cd backend
npx prisma studio
```
Open http://localhost:5555 in your browser

### Option 2: PostgreSQL CLI
```bash
psql -U fawzywassel -d vp_scheduling_db
```

Common queries:
```sql
-- List all users
SELECT id, email, name, role FROM "User";

-- List all meetings
SELECT * FROM "Meeting";
```

## API Endpoints

### Authentication
- `POST /auth/local/register` - Register new user
- `POST /auth/local/login` - Login with email/password
- `POST /auth/login` - SSO login (requires SSO configuration)
- `GET /auth/me` - Get current user (requires Bearer token)
- `POST /auth/logout` - Logout

### Protected Routes
All other endpoints require authentication. Include the JWT token in the header:
```
Authorization: Bearer <your-token>
```

## Troubleshooting

### PostgreSQL not running?
```bash
brew services start postgresql@16
```

### Need to reset the database?
```bash
cd backend
npx prisma migrate reset
```

### Want to see the API documentation?
Once the server is running, visit:
- Swagger UI: http://localhost:3001/api (if configured)

## Project Structure

```
appointment/
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication (SSO + Local)
│   │   ├── users/         # User management
│   │   ├── calendar/      # Calendar integration
│   │   ├── meetings/      # Meeting management
│   │   ├── availability/  # Availability rules
│   │   ├── notifications/ # Email/SMS notifications
│   │   └── delegation/    # EA delegation
│   ├── prisma/           # Database schema & migrations
│   ├── .env              # Environment variables (configured)
│   └── LOCAL_AUTH.md     # Local auth documentation
├── frontend/             # Next.js frontend
└── DATABASE_SETUP.md     # Database documentation
```

## Next Steps

1. **Start the backend**: `npm run start:dev`
2. **Create a test user** via the register endpoint
3. **Test authentication** and get a JWT token
4. **Explore the database** with Prisma Studio
5. **Start the frontend** (if needed):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs on http://localhost:3000

## Documentation

- `LOCAL_AUTH.md` - Local authentication details
- `DATABASE_SETUP.md` - Database configuration and commands
- `README.md` - Full project documentation
- `TESTING.md` - Testing guidelines

## Need Help?

- Check logs when running the backend
- Use Prisma Studio to inspect database
- Review the API endpoints in the controller files
- Check `.env` file for configuration

Happy coding! 🚀
