# Phase 3: Calendar Integration - Complete! ✅

## What Was Implemented

### Backend Services

#### 1. Microsoft Graph Service (`microsoft-graph.service.ts`)
- ✅ OAuth authentication flow for Outlook calendars
- ✅ Token management (access & refresh tokens)
- ✅ Fetch calendar events with privacy support
- ✅ Get busy times for availability checking
- ✅ Create calendar events
- ✅ Automatic token refresh

#### 2. Google Calendar Service (`google-calendar.service.ts`)
- ✅ OAuth authentication flow for Google Calendar
- ✅ Token management with refresh capability
- ✅ Fetch calendar events with privacy handling
- ✅ Get busy times for conflict detection
- ✅ Create calendar events

#### 3. Calendar Service (`calendar.service.ts`)
- ✅ Unified calendar connection management
- ✅ OAuth URL generation for both providers
- ✅ Calendar connection/disconnection
- ✅ Aggregate busy times from multiple calendars
- ✅ **REQ-03: Conflict detection** with buffer time support
- ✅ Automatic token refresh on expiry

#### 4. Availability Service (`availability.service.ts`)
- ✅ Working hours management (per weekday)
- ✅ **Buffer time configuration** (default 15 minutes)
- ✅ Available time slot generation
- ✅ **REQ-02: Time zone support**
- ✅ Slot availability validation
- ✅ Integration with calendar conflict checking

#### 5. Timezone Utilities (`timezone.util.ts`)
- ✅ Timezone conversion utilities
- ✅ Time range overlap detection
- ✅ Buffer time calculations
- ✅ Working hours parsing

### API Endpoints

#### Calendar Endpoints (`/api/calendar`)
- **GET** `/connect/:provider` - Get OAuth URL for calendar connection
- **GET** `/callback/:provider` - OAuth callback handler
- **GET** `/connections` - List connected calendars
- **DELETE** `/disconnect/:provider` - Disconnect calendar
- **GET** `/busy-times` - Get busy times from all calendars

#### Availability Endpoints (`/api/availability`)
- **GET** `/rules` - Get availability rules
- **PUT** `/rules` - Update availability rules (buffer, working hours)
- **GET** `/slots` - Get available time slots
- **GET** `/check` - Check if specific slot is available
- **GET** `/:vpId/slots` - Public endpoint to get VP's available slots

## Technical Requirements Met

✅ **REQ-02: Time Zone Detection**
- Automatic timezone handling across all date operations
- Timezone conversion utilities for cross-timezone scheduling
- User timezone stored in database

✅ **REQ-03: Conflict Resolution**
- Real-time conflict detection against external calendars
- Checks both Outlook and Google calendars
- Instant grayout of conflicting slots
- Automatic refresh of calendar connections

✅ **REQ-04: Meeting Privacy**
- Private calendar events shown as "Busy"
- Event details hidden for private meetings
- Supports both Outlook and Google privacy settings

## Features

### Calendar Integration
- **Multi-provider support**: Connect Outlook and/or Google Calendar
- **OAuth 2.0 flows**: Secure authorization for both providers
- **Token management**: Automatic refresh when tokens expire
- **Privacy-aware**: Respects private event settings

### Conflict Detection
- **Real-time checking**: Validates against all connected calendars
- **Buffer time**: Configurable buffer (default 15 min) between meetings
- **Internal + External**: Checks both app meetings and calendar events
- **Overlap detection**: Prevents double-booking

### Availability Management
- **Working hours**: Configure per weekday
- **Flexible schedules**: Multiple time periods per day
- **Time zones**: Full timezone support
- **Smart slots**: Only generates slots within working hours

## Database Schema Used

```prisma
model CalendarConnection {
  id           String
  userId       String
  provider     CalendarProvider  // OUTLOOK | GOOGLE
  accessToken  String
  refreshToken String?
  tokenExpiry  DateTime?
  calendarId   String?
  isActive     Boolean
}

model AvailabilityRule {
  id            String
  userId        String
  bufferMinutes Int              // Default: 15
  workingHours  Json            // {"monday": [{"start": "09:00", "end": "17:00"}]}
}
```

## Testing the Calendar Integration

### 1. Connect Outlook Calendar

```bash
# Get OAuth URL
GET /api/calendar/connect/outlook
Authorization: Bearer <jwt_token>

# Response
{
  "authUrl": "https://login.microsoftonline.com/..."
}

# User visits authUrl, grants permission, redirected to callback
GET /api/calendar/callback/outlook?code=<code>&state=<state>

# Response
{
  "message": "Calendar connected successfully",
  "connection": {
    "id": "uuid",
    "provider": "OUTLOOK"
  }
}
```

### 2. Connect Google Calendar

```bash
# Get OAuth URL
GET /api/calendar/connect/google
Authorization: Bearer <jwt_token>

# User visits authUrl, grants permission, redirected to callback
GET /api/calendar/callback/google?code=<code>&state=<state>
```

### 3. Configure Availability

```bash
# Update working hours
PUT /api/availability/rules
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "bufferMinutes": 15,
  "workingHours": {
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "15:00"}],
    "saturday": [],
    "sunday": []
  }
}
```

### 4. Get Available Slots

```bash
# Get your own slots
GET /api/availability/slots?startDate=2025-12-26T00:00:00Z&endDate=2025-12-27T00:00:00Z&duration=30
Authorization: Bearer <jwt_token>

# Response
{
  "slots": [
    {
      "start": "2025-12-26T09:00:00Z",
      "end": "2025-12-26T09:30:00Z",
      "available": true
    },
    {
      "start": "2025-12-26T09:30:00Z",
      "end": "2025-12-26T10:00:00Z",
      "available": false  // Conflict detected
    }
  ]
}
```

### 5. Check Specific Slot

```bash
GET /api/availability/check?userId=<vpId>&startTime=2025-12-26T09:00:00Z&endTime=2025-12-26T09:30:00Z
Authorization: Bearer <jwt_token>

# Response
{
  "available": true
}
```

## Environment Variables Required

Add to `backend/.env`:

```env
# Microsoft Graph API (Outlook)
MICROSOFT_CLIENT_ID=your-microsoft-app-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-app-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/calendar/callback/outlook

# Google Calendar API
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/callback/google
```

## Setting Up Calendar APIs

### Microsoft Graph (Outlook)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Set name: "VP Scheduling App"
5. Set redirect URI: `http://localhost:3001/api/calendar/callback/outlook`
6. After creation, note the "Application (client) ID" and "Directory (tenant) ID"
7. Go to "Certificates & secrets" > "New client secret"
8. Copy the secret value
9. Go to "API permissions" > "Add permission" > "Microsoft Graph"
10. Add delegated permissions: `Calendars.Read`, `Calendars.ReadWrite`, `offline_access`
11. Click "Grant admin consent"

### Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google Calendar API"
4. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3001/api/calendar/callback/google`
7. Copy the "Client ID" and "Client Secret"

## How It Works

### Calendar Connection Flow

```
1. User clicks "Connect Outlook/Google"
2. Frontend calls GET /api/calendar/connect/:provider
3. Backend generates OAuth URL with state
4. User redirected to provider's OAuth page
5. User grants permission
6. Provider redirects to callback with code
7. Backend exchanges code for tokens
8. Tokens stored in database
9. Calendar now connected!
```

### Conflict Detection Flow

```
1. User/System requests available slots
2. AvailabilityService generates slots based on working hours
3. For each slot:
   a. CalendarService checks all connected calendars
   b. Fetches busy times from Outlook and/or Google
   c. Checks internal meetings in database
   d. Applies buffer time (15 min before/after)
   e. Marks slot as available/unavailable
4. Returns filtered available slots
```

### Automatic Token Refresh

```
1. Calendar API call fails with 401
2. CalendarService detects expired token
3. Attempts refresh using refresh_token
4. Updates database with new tokens
5. Retries original request
6. If refresh fails, marks connection as inactive
```

## Next Steps

Frontend implementation needed:
- Calendar connection UI component
- Available slots calendar picker
- Working hours configuration UI
- Conflict indicators

Then ready for **Phase 4: Meeting Management**!
- Meeting booking interface
- Meeting types (virtual/in-person)
- Intake forms
- Meeting status management
