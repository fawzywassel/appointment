# Notification System Documentation

## Overview

The VP Scheduling Application includes a comprehensive notification system that keeps users informed about their meetings through email and SMS channels. The system features automated scheduling, daily briefs, and timely reminders.

## Features

### 1. **Email Notifications (SendGrid)**
- Meeting confirmations
- Meeting reminders (1 hour before by default)
- Meeting cancellations
- Daily brief emails (sent at 7 AM daily)
- Professional HTML email templates with gradient headers
- Meeting join links for virtual meetings
- Agenda and location information

### 2. **SMS Notifications (Twilio)** *(Optional)*
- Quick text reminders
- Urgent notifications
- Configurable phone number support

### 3. **Automated Scheduling**
- **Notification Processor**: Runs every minute to send pending notifications
- **Daily Brief**: Sent at 7:00 AM every day to all VPs and EAs
- Persistent queue with PENDING/SENT/FAILED status tracking
- Automatic retry for failed notifications

### 4. **Notification Types**
- `CONFIRMATION`: Meeting booking confirmation
- `REMINDER`: Pre-meeting reminder (default: 60 minutes before)
- `CANCELLATION`: Meeting cancellation notice
- `DAILY_BRIEF`: Morning summary of day's meetings
- `RESCHEDULE`: Meeting time change notification
- `DELEGATION`: Delegation permission changes

## Configuration

### Environment Variables

Required in `backend/.env`:

```bash
# SendGrid Configuration (Required for email)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourcompany.com
SENDGRID_FROM_NAME=VP Scheduling

# Twilio Configuration (Optional for SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Meeting Configuration
MEETING_REMINDER_MINUTES=60  # Default: 60 minutes before meeting
DEFAULT_BUFFER_MINUTES=15
```

### Setup Instructions

#### 1. **SendGrid Setup** (Email)

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Choose "Full Access"
   - Copy the key (starts with `SG.`)
3. Verify sender identity:
   - Go to Settings > Sender Authentication
   - Verify your domain or single sender email
4. Add to `.env`:
   ```bash
   SENDGRID_API_KEY=SG.your-actual-key-here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

#### 2. **Twilio Setup** (SMS - Optional)

1. Create a Twilio account at https://twilio.com
2. Get your credentials:
   - Account SID (found on dashboard)
   - Auth Token (found on dashboard)
   - Phone Number (purchase from Twilio Console)
3. Add to `.env`:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token-here
   TWILIO_PHONE_NUMBER=+15551234567
   ```

**Note**: SMS is optional. If Twilio is not configured, the system will skip SMS and only send emails.

## How It Works

### Notification Lifecycle

```
1. Event occurs (meeting booked/cancelled/time approaching)
   ↓
2. scheduleNotification() creates record in database
   Status: PENDING
   ↓
3. Cron job (runs every minute) picks up PENDING notifications
   where scheduledTime <= NOW
   ↓
4. sendEmail() sends via SendGrid
   sendSMS() sends via Twilio (if configured)
   ↓
5. Status updated: SENT or FAILED
   sentAt timestamp recorded
```

### Daily Brief System

**Schedule**: Every day at 7:00 AM (configurable via cron expression)

**Process**:
1. Query all users with role VP or EA
2. For each user, fetch today's meetings (start time between 00:00 - 23:59)
3. Generate HTML email with:
   - Greeting with user's name
   - List of all meetings with times
   - Meeting details (location, virtual link, attendees, agenda)
   - Status badges (PENDING/CONFIRMED)
4. Send email via SendGrid
5. Skip users with no meetings today

**Example Daily Brief**:
```
Subject: Daily Brief - December 25, 2025 - 3 meetings scheduled

Good morning, John! 👋

You have 3 meetings scheduled for today. Here's your agenda:

1. Product Review Meeting [CONFIRMED]
   ⏰ 9:00 AM - 10:00 AM
   💻 Virtual Meeting
   👤 With: Jane Smith
   🔗 Join Meeting
   Agenda: Q4 product roadmap review and planning

2. Budget Planning [PENDING]
   ⏰ 2:00 PM - 3:00 PM
   📍 Conference Room A
   👤 With: Finance Team
   Agenda: FY2026 budget allocation discussion
   
...
```

### Reminder System

**Schedule**: Configurable (default: 60 minutes before meeting)

**Process**:
1. When meeting is booked, calculate reminder time:
   ```
   reminderTime = meetingStartTime - MEETING_REMINDER_MINUTES
   ```
2. Create notification record with `scheduledTime = reminderTime`
3. Cron job sends notification at scheduled time
4. Email includes:
   - Meeting title and time
   - Location or virtual meeting link
   - Attendee information
   - Agenda/notes
   - One-click join button (for virtual)

## API Methods

### NotificationsService Methods

#### Core Sending Methods

```typescript
// Send email via SendGrid
async sendEmail(to: string, subject: string, htmlContent: string): Promise<void>

// Send SMS via Twilio
async sendSMS(to: string, body: string): Promise<void>
```

#### Scheduling Methods

```typescript
// Schedule a notification for future delivery
async scheduleNotification(data: {
  userId: string;
  type: string;
  scheduledTime: Date;
  content: any;
}): Promise<Notification>

// Send meeting confirmation immediately
async sendMeetingConfirmation(meeting: Meeting): Promise<void>

// Schedule reminder before meeting
async scheduleMeetingReminder(meeting: Meeting): Promise<void>

// Send cancellation notice immediately
async sendCancellationNotification(meeting: Meeting): Promise<void>
```

#### Automated Jobs

```typescript
// Process all pending notifications (runs every minute)
@Cron('0 * * * * *')
async handleNotificationCron(): Promise<void>

// Send daily briefs to all VPs and EAs (runs at 7 AM)
@Cron('0 0 7 * * *')
async sendDailyBrief(): Promise<void>
```

#### Manual Operations

```typescript
// Manually process pending notifications
async processPendingNotifications(): Promise<void>

// Generate and send daily brief for specific user
async generateAndSendDailyBrief(user: User): Promise<void>
```

## Database Schema

### Notification Table

```prisma
model Notification {
  id            String             @id @default(uuid())
  userId        String
  type          String             // "REMINDER", "DAILY_BRIEF", "CANCELLATION", etc.
  scheduledTime DateTime
  status        NotificationStatus @default(PENDING)
  content       Json               // { subject, body, meetingUrl, meetingId }
  sentAt        DateTime?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  
  user User @relation(fields: [userId], references: [id])
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}
```

## Monitoring & Troubleshooting

### Check Notification Queue

```sql
-- View pending notifications
SELECT id, type, scheduledTime, userId, status
FROM "Notification"
WHERE status = 'PENDING'
ORDER BY scheduledTime ASC;

-- View failed notifications
SELECT id, type, scheduledTime, userId, createdAt
FROM "Notification"
WHERE status = 'FAILED'
ORDER BY createdAt DESC;

-- View notification statistics
SELECT 
  type,
  status,
  COUNT(*) as count
FROM "Notification"
GROUP BY type, status;
```

### Logs

The notification service logs all operations:

```bash
# Success logs
[NotificationsService] Email sent to user@example.com
[NotificationsService] SMS sent to +15551234567
[NotificationsService] Notification abc123 sent successfully
[NotificationsService] Daily brief sent to user@example.com with 3 meetings

# Warning logs
[NotificationsService] SendGrid from email not configured
[NotificationsService] Twilio not configured, skipping SMS
[NotificationsService] No meetings today for user@example.com, skipping daily brief

# Error logs
[NotificationsService] Failed to send email to user@example.com: <error>
[NotificationsService] Failed to send notification abc123: <error>
```

### Common Issues

#### 1. **Emails Not Sending**

**Problem**: Notifications stuck in PENDING status

**Solutions**:
- Verify `SENDGRID_API_KEY` is set correctly
- Check SendGrid API key has "Mail Send" permission
- Verify sender email is authenticated in SendGrid
- Check application logs for errors
- Test SendGrid connection:
  ```bash
  curl --request POST \
    --url https://api.sendgrid.com/v3/mail/send \
    --header "Authorization: Bearer $SENDGRID_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
  ```

#### 2. **Daily Brief Not Received**

**Problem**: Users not receiving morning emails

**Solutions**:
- Verify cron job is running: Check logs for "Sending daily briefs..."
- Ensure users have role `VP` or `EA`
- Verify users have meetings scheduled for today
- Check server timezone matches expected timezone
- Manually trigger: Call `notificationsService.sendDailyBrief()` in code

#### 3. **Wrong Reminder Timing**

**Problem**: Reminders sent at incorrect time

**Solutions**:
- Check `MEETING_REMINDER_MINUTES` environment variable
- Verify server timezone is correct
- Check notification `scheduledTime` in database
- Ensure meeting `startTime` is in UTC

#### 4. **SMS Not Sending**

**Problem**: SMS notifications not delivered

**Solutions**:
- Verify all Twilio credentials are set
- Check phone number format (must include country code: +1234567890)
- Ensure Twilio phone number is SMS-enabled
- Check Twilio account balance
- Review Twilio console for error messages

## Testing

### Manual Testing

#### 1. **Test Email Sending**

```typescript
// In NestJS controller or service
await this.notificationsService.sendEmail(
  'test@example.com',
  'Test Email',
  '<h1>Hello World</h1><p>This is a test email.</p>'
);
```

#### 2. **Test Daily Brief**

```typescript
// Get a user
const user = await this.prisma.user.findFirst({
  where: { role: 'VP' }
});

// Generate and send daily brief
await this.notificationsService.generateAndSendDailyBrief(user);
```

#### 3. **Test Notification Queue**

```typescript
// Schedule a test notification for 1 minute from now
await this.notificationsService.scheduleNotification({
  userId: 'user-id',
  type: 'TEST',
  scheduledTime: new Date(Date.now() + 60000),
  content: {
    subject: 'Test Notification',
    body: 'This is a test notification',
  },
});

// Wait 1 minute, check if status changes to SENT
```

### Automated Testing

```typescript
// notifications.service.spec.ts
describe('NotificationsService', () => {
  it('should send email via SendGrid', async () => {
    await service.sendEmail('test@example.com', 'Test', '<p>Test</p>');
    expect(mockSendGrid.send).toHaveBeenCalled();
  });

  it('should schedule daily brief cron job', () => {
    const spy = jest.spyOn(service, 'sendDailyBrief');
    // Trigger cron manually
    expect(spy).toHaveBeenCalled();
  });

  it('should process pending notifications', async () => {
    // Create pending notification
    await prisma.notification.create({
      data: {
        userId: 'test-user',
        type: 'REMINDER',
        status: 'PENDING',
        scheduledTime: new Date(),
        content: { subject: 'Test', body: 'Test' },
      },
    });

    await service.processPendingNotifications();

    // Verify status changed to SENT
    const notification = await prisma.notification.findFirst();
    expect(notification.status).toBe('SENT');
  });
});
```

## Performance Considerations

### Batch Processing

The notification processor handles 100 notifications per run:

```typescript
take: 100, // Process in batches
```

If you have more than 100 pending notifications, they'll be processed in the next cron run (1 minute later).

### Database Indexes

Recommended indexes for optimal performance:

```sql
-- Index for finding pending notifications
CREATE INDEX idx_notification_status_scheduled 
ON "Notification" (status, scheduledTime);

-- Index for user lookups
CREATE INDEX idx_notification_user 
ON "Notification" (userId);

-- Index for type filtering
CREATE INDEX idx_notification_type 
ON "Notification" (type);
```

### Cleanup Old Notifications

Consider implementing a cleanup job to remove old sent notifications:

```typescript
@Cron('0 0 0 * * *') // Daily at midnight
async cleanupOldNotifications() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  await this.prisma.notification.deleteMany({
    where: {
      status: 'SENT',
      sentAt: { lt: thirtyDaysAgo },
    },
  });
}
```

## Customization

### Change Daily Brief Time

Edit the cron expression in `notifications.service.ts`:

```typescript
@Cron('0 0 7 * * *') // 7 AM
// Change to:
@Cron('0 0 8 * * *') // 8 AM
@Cron('0 30 6 * * *') // 6:30 AM
```

### Change Reminder Timing

Update environment variable:

```bash
MEETING_REMINDER_MINUTES=120  # 2 hours before
MEETING_REMINDER_MINUTES=30   # 30 minutes before
```

### Customize Email Templates

Edit template methods in `notifications.service.ts`:

- `generateDailyBriefHTML()` - Daily brief template
- `generateMeetingConfirmationEmail()` - Confirmation template
- `generateMeetingReminderEmail()` - Reminder template
- `generateCancellationEmail()` - Cancellation template
- `formatEmailHTML()` - Generic email wrapper

### Add Custom Notification Type

```typescript
// 1. Add to database
await this.notificationsService.scheduleNotification({
  userId: user.id,
  type: 'CUSTOM_TYPE',
  scheduledTime: new Date(),
  content: {
    subject: 'Custom Subject',
    body: 'Custom message',
  },
});

// 2. Create custom template method
private generateCustomEmail(data: any): string {
  return `<h1>Custom Template</h1><p>${data.message}</p>`;
}
```

## Best Practices

1. **Always use HTML templates** for better user experience
2. **Include unsubscribe links** (required by SendGrid for compliance)
3. **Test in sandbox mode** before production
4. **Monitor SendGrid/Twilio quotas** and usage
5. **Implement retry logic** for failed notifications
6. **Log all notification events** for debugging
7. **Use environment-specific sender emails** (dev/staging/prod)
8. **Respect user notification preferences** (when implemented)
9. **Include timezone information** in meeting times
10. **Make email templates mobile-responsive**

## Security

- API keys stored in environment variables (never committed)
- SendGrid API key has minimal required permissions
- Email content sanitized to prevent XSS
- Rate limiting applied to prevent abuse
- User email verification before sending
- Secure credential storage in production

## Future Enhancements

- [ ] User notification preferences (email/SMS opt-in/out)
- [ ] In-app notifications (push notifications)
- [ ] Notification templates management UI
- [ ] A/B testing for email templates
- [ ] Delivery tracking and analytics
- [ ] Multi-language support
- [ ] Webhook integrations (Slack, Teams)
- [ ] Notification digest (weekly summary)
- [ ] Custom notification schedules per user
- [ ] SMS templates with link shortening

## Support

For issues or questions:
1. Check application logs: `docker-compose logs backend`
2. Review SendGrid/Twilio dashboards
3. Query notification table for failed records
4. Test API keys with curl commands
5. Verify environment variables are loaded

---

**Last Updated**: December 2025  
**Version**: 1.0.0
