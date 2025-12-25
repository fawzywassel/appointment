# VP Scheduling Application

A comprehensive scheduling application for VPs with calendar integration, delegation support, and intelligent notifications.

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **PostgreSQL** - Primary database
- **Prisma** - ORM
- **Redis** - Caching layer
- **JWT** - Authentication
- **Socket.IO** - Real-time updates

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Socket.IO Client** - Real-time updates

## Features

- ✅ SSO Integration (Azure AD/OKTA)
- ✅ Calendar sync (Outlook & Google)
- ✅ Automatic conflict detection
- ✅ Time zone support
- ✅ Buffer time management
- ✅ EA delegation and proxy booking
- ✅ Virtual/In-person meetings
- ✅ Custom intake forms
- ✅ Automated reminders
- ✅ Daily brief emails
- ✅ Meeting privacy controls

## Project Structure

```
vp-scheduling-app/
├── backend/              # NestJS backend
│   ├── src/
│   │   ├── auth/        # Authentication module
│   │   ├── users/       # User management
│   │   ├── calendar/    # Calendar integration
│   │   ├── meetings/    # Meeting management
│   │   ├── availability/# Availability rules
│   │   ├── notifications/# Email/SMS notifications
│   │   └── delegation/  # EA delegation
│   ├── prisma/          # Database schema
│   └── .env.example
├── frontend/            # Next.js frontend
│   ├── app/
│   │   ├── login/      # SSO login
│   │   ├── dashboard/  # VP/EA dashboard
│   │   ├── booking/    # Public booking page
│   │   ├── settings/   # User settings
│   │   └── admin/      # Admin panel
│   └── .env.example
└── docker-compose.yml   # PostgreSQL & Redis
```

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL and Redis)
- Azure AD or OKTA account (for SSO)
- Microsoft Graph API credentials (for Outlook)
- Google Calendar API credentials (for Google Calendar)
- SendGrid account (for emails)
- Twilio account (for SMS) - optional

## Getting Started

### 1. Clone and Install Dependencies

```bash
cd vp-scheduling-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Docker Services

```bash
# From project root
docker-compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

### 3. Configure Environment Variables

#### Backend
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and configure:
- Database URL (default should work with Docker Compose)
- JWT secret
- SSO credentials (Azure AD/OKTA)
- Microsoft Graph API credentials
- Google Calendar API credentials
- SendGrid API key
- Twilio credentials (optional)

#### Frontend
```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local` and configure:
- API URL (default: http://localhost:3001)
- SSO client ID and authority

### 4. Run Database Migration

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start Development Servers

#### Backend (Terminal 1)
```bash
cd backend
npm run start:dev
```

Backend runs on http://localhost:3001

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:3000

## Database Schema

### Core Tables
- **users** - User accounts with roles (VP, EA, ATTENDEE, ADMIN)
- **calendar_connections** - Connected Outlook/Google calendars
- **availability_rules** - Working hours and buffer time settings
- **meetings** - Scheduled meetings with type and status
- **meeting_forms** - Agenda and notes for meetings
- **delegations** - EA-VP relationships and permissions
- **notifications** - Scheduled email/SMS reminders

## API Endpoints (Coming in Phase 2+)

### Authentication
- `POST /auth/login` - SSO login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Current user

### Users
- `GET /users` - List users (admin)
- `GET /users/:id` - Get user
- `PATCH /users/:id` - Update user

### Calendar
- `POST /calendar/connect` - Connect calendar
- `GET /calendar/availability/:userId` - Get available slots
- `DELETE /calendar/:id` - Disconnect calendar

### Meetings
- `POST /meetings` - Create meeting
- `GET /meetings` - List meetings
- `GET /meetings/:id` - Get meeting details
- `PATCH /meetings/:id` - Update meeting
- `DELETE /meetings/:id` - Cancel meeting

### Availability
- `GET /availability/rules` - Get availability rules
- `PUT /availability/rules` - Update availability rules

### Delegation
- `POST /delegation` - Create delegation
- `GET /delegation` - List delegations
- `DELETE /delegation/:id` - Remove delegation

## Development Commands

### Backend
```bash
npm run start:dev    # Start with hot reload
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
```

### Database
```bash
npx prisma studio              # Open Prisma Studio (DB GUI)
npx prisma migrate dev         # Create new migration
npx prisma generate            # Generate Prisma Client
npx prisma db push             # Push schema without migration
```

## Next Steps

Phase 1 is complete! The project structure is set up with:
- ✅ NestJS backend with all dependencies
- ✅ Next.js frontend with TypeScript and TailwindCSS
- ✅ Database schema with Prisma
- ✅ Docker Compose for PostgreSQL and Redis
- ✅ Environment configuration templates

**Ready for Phase 2:** Authentication (SSO Integration)

## Contributing

This is a business application. Follow the existing code structure and patterns when adding new features.

## License

Proprietary - All rights reserved
