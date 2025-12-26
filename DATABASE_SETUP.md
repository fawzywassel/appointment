# Database Setup - Complete! ✓

Your application is now connected to a local PostgreSQL database.

## Connection Details

- **Database Name**: `vp_scheduling_db`
- **Host**: `localhost`
- **Port**: `5432`
- **User**: `fawzywassel`
- **Connection String**: `postgresql://fawzywassel@localhost:5432/vp_scheduling_db?schema=public`

## Tables Created

The following tables have been created successfully:
- `User` (with password field for local auth)
- `CalendarConnection`
- `AvailabilityRule`
- `Meeting`
- `MeetingForm`
- `Delegation`
- `Notification`
- `_prisma_migrations`

## Useful Commands

### Access Database via CLI
```bash
psql -U fawzywassel -d vp_scheduling_db
```

### List All Tables
```bash
psql -U fawzywassel -d vp_scheduling_db -c "\dt"
```

### View User Table Structure
```bash
psql -U fawzywassel -d vp_scheduling_db -c "\d \"User\""
```

### Query Users
```bash
psql -U fawzywassel -d vp_scheduling_db -c "SELECT id, email, name, role FROM \"User\";"
```

### Prisma Studio (GUI Database Browser)
```bash
cd backend
npx prisma studio
```
This opens a web interface at http://localhost:5555

### Run New Migrations
```bash
cd backend
npx prisma migrate dev --name <migration_name>
```

### Reset Database (Warning: Deletes all data!)
```bash
cd backend
npx prisma migrate reset
```

## Starting the Application

1. **Start the backend server**:
```bash
cd backend
npm run start:dev
```
Backend will run on http://localhost:3001

2. **Test the local authentication**:
```bash
cd backend
./test-local-auth.sh
```

## PostgreSQL Service Management

### Check if PostgreSQL is running:
```bash
brew services list | grep postgresql
```

### Start PostgreSQL:
```bash
brew services start postgresql@16
```

### Stop PostgreSQL:
```bash
brew services stop postgresql@16
```

### Restart PostgreSQL:
```bash
brew services restart postgresql@16
```

## Environment Configuration

Your `.env` file is configured with:
- Local PostgreSQL connection
- JWT secret (change in production!)
- Development settings

Remember to configure other services (Redis, SendGrid, Twilio, etc.) as needed for full functionality.

## Next Steps

1. Start the backend: `npm run start:dev`
2. Test local authentication endpoints
3. Create your first user via POST `/auth/local/register`
4. Explore the database with Prisma Studio: `npx prisma studio`
