import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { format, startOfDay, endOfDay } from 'date-fns';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';

export interface NotificationData {
  userId: string;
  type: string;
  scheduledTime: Date;
  content: {
    subject: string;
    body: string;
    meetingId?: string;
    meetingUrl?: string;
    location?: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private twilioClient: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize SendGrid
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      this.logger.log('SendGrid initialized');
    } else {
      this.logger.warn('SendGrid API key not configured');
    }

    // Initialize Twilio
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (twilioSid && twilioToken) {
      this.twilioClient = new Twilio(twilioSid, twilioToken);
      this.logger.log('Twilio initialized');
    } else {
      this.logger.warn('Twilio credentials not configured');
    }
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(data: NotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        scheduledTime: data.scheduledTime,
        content: data.content,
        status: 'PENDING',
      },
    });
  }

  /**
   * Send meeting confirmation email
   */
  async sendMeetingConfirmation(meeting: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: meeting.attendeeId || meeting.vpId },
    });

    if (!user) return;

    const content = {
      subject: `Meeting Confirmed: ${meeting.title || 'Meeting'}`,
      body: this.generateMeetingConfirmationEmail(meeting),
      meetingId: meeting.id,
      meetingUrl: meeting.meetingUrl,
      location: meeting.location,
    };

    await this.scheduleNotification({
      userId: user.id,
      type: 'MEETING_CONFIRMATION',
      scheduledTime: new Date(),
      content,
    });

    this.logger.log(`Meeting confirmation sent to ${user.email}`);
  }

  /**
   * Schedule meeting reminder
   */
  async scheduleMeetingReminder(meeting: any) {
    const reminderMinutes = this.configService.get<number>('MEETING_REMINDER_MINUTES') || 60;
    const reminderTime = new Date(meeting.startTime.getTime() - reminderMinutes * 60 * 1000);

    // Only schedule if reminder is in the future
    if (reminderTime > new Date()) {
      const users = [meeting.vpId, meeting.attendeeId].filter(Boolean);

      for (const userId of users) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) continue;

        const content = {
          subject: `Reminder: Meeting in ${reminderMinutes} minutes`,
          body: this.generateMeetingReminderEmail(meeting, reminderMinutes),
          meetingId: meeting.id,
          meetingUrl: meeting.meetingUrl,
          location: meeting.location,
        };

        await this.scheduleNotification({
          userId: user.id,
          type: 'REMINDER',
          scheduledTime: reminderTime,
          content,
        });
      }

      this.logger.log(`Reminders scheduled for meeting ${meeting.id}`);
    }
  }

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(meeting: any) {
    const users = [meeting.vpId, meeting.attendeeId].filter(Boolean);

    for (const userId of users) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) continue;

      const content = {
        subject: `Meeting Cancelled: ${meeting.title || 'Meeting'}`,
        body: this.generateCancellationEmail(meeting),
        meetingId: meeting.id,
      };

      await this.scheduleNotification({
        userId: user.id,
        type: 'CANCELLATION',
        scheduledTime: new Date(),
        content,
      });
    }

    this.logger.log(`Cancellation notifications sent for meeting ${meeting.id}`);
  }

  /**
   * Generate meeting confirmation email
   */
  private generateMeetingConfirmationEmail(meeting: any): string {
    const startTime = format(new Date(meeting.startTime), 'PPpp');
    const endTime = format(new Date(meeting.endTime), 'p');

    return `
Your meeting has been confirmed!

Meeting: ${meeting.title || 'Meeting'}
Time: ${startTime} - ${endTime}
Type: ${meeting.type}
${meeting.type === 'VIRTUAL' ? `Join URL: ${meeting.meetingUrl}` : `Location: ${meeting.location || 'TBD'}`}

Looking forward to seeing you!
    `.trim();
  }

  /**
   * Generate meeting reminder email
   */
  private generateMeetingReminderEmail(meeting: any, minutes: number): string {
    const startTime = format(new Date(meeting.startTime), 'PPpp');

    return `
Reminder: Your meeting starts in ${minutes} minutes!

Meeting: ${meeting.title || 'Meeting'}
Start Time: ${startTime}
${meeting.type === 'VIRTUAL' ? `\nJoin Now: ${meeting.meetingUrl}` : `Location: ${meeting.location || 'TBD'}`}

Please join on time.
    `.trim();
  }

  /**
   * Generate cancellation email
   */
  private generateCancellationEmail(meeting: any): string {
    const startTime = format(new Date(meeting.startTime), 'PPpp');

    return `
This meeting has been cancelled.

Meeting: ${meeting.title || 'Meeting'}
Originally Scheduled: ${startTime}

If you have any questions, please contact the organizer.
    `.trim();
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    try {
      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');
      if (!fromEmail) {
        this.logger.warn('SendGrid from email not configured');
        return;
      }

      const msg = {
        to,
        from: fromEmail,
        subject,
        html: htmlContent,
      };

      await sgMail.send(msg);
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to: string, body: string): Promise<void> {
    try {
      if (!this.twilioClient) {
        this.logger.warn('Twilio not configured, skipping SMS');
        return;
      }

      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!fromNumber) {
        this.logger.warn('Twilio phone number not configured');
        return;
      }

      await this.twilioClient.messages.create({
        body,
        from: fromNumber,
        to,
      });

      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Process pending notifications (called by cron or manually)
   */
  async processPendingNotifications(): Promise<void> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledTime: {
          lte: new Date(),
        },
      },
      include: {
        user: true,
      },
      take: 100, // Process in batches
    });

    this.logger.log(`Processing ${notifications.length} pending notifications`);

    for (const notification of notifications) {
      try {
        const content = notification.content as any;
        
        // Send email
        await this.sendEmail(
          notification.user.email,
          content.subject,
          this.formatEmailHTML(content),
        );

        // Update notification status
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        this.logger.log(`Notification ${notification.id} sent successfully`);
      } catch (error) {
        // Mark as failed
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED' },
        });

        this.logger.error(`Failed to send notification ${notification.id}:`, error);
      }
    }
  }

  /**
   * Cron job: Process notifications every minute
   */
  @Cron('0 * * * * *') // Every minute
  async handleNotificationCron() {
    await this.processPendingNotifications();
  }

  /**
   * Cron job: Send daily brief at 7 AM
   */
  @Cron('0 0 7 * * *') // Every day at 7 AM
  async sendDailyBrief() {
    this.logger.log('Sending daily briefs...');

    // Get all VPs and EAs
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['VP', 'EA'] },
      },
    });

    for (const user of users) {
      try {
        await this.generateAndSendDailyBrief(user);
      } catch (error) {
        this.logger.error(`Failed to send daily brief to ${user.email}:`, error);
      }
    }
  }

  /**
   * Generate and send daily brief for a user
   */
  async generateAndSendDailyBrief(user: any): Promise<void> {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get today's meetings
    const meetings = await this.prisma.meeting.findMany({
      where: {
        OR: [
          { vpId: user.id },
          { attendeeId: user.id },
        ],
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        vp: { select: { name: true, email: true } },
        attendee: { select: { name: true, email: true } },
        meetingForm: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (meetings.length === 0) {
      this.logger.log(`No meetings today for ${user.email}, skipping daily brief`);
      return;
    }

    // Generate HTML email
    const htmlContent = this.generateDailyBriefHTML(user, meetings, today);

    // Send email
    await this.sendEmail(
      user.email,
      `Daily Brief - ${format(today, 'MMMM d, yyyy')} - ${meetings.length} meeting${meetings.length > 1 ? 's' : ''} scheduled`,
      htmlContent,
    );

    this.logger.log(`Daily brief sent to ${user.email} with ${meetings.length} meetings`);
  }

  /**
   * Generate daily brief HTML email
   */
  private generateDailyBriefHTML(user: any, meetings: any[], date: Date): string {
    const meetingsHtml = meetings.map((meeting, index) => {
      const startTime = format(new Date(meeting.startTime), 'h:mm a');
      const endTime = format(new Date(meeting.endTime), 'h:mm a');
      const otherPerson = meeting.vpId === user.id ? meeting.attendee : meeting.vp;
      const agenda = meeting.meetingForm?.agendaUrl || meeting.meetingForm?.notes || 'No agenda provided';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 16px 0;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
              ${index + 1}. ${meeting.title || 'Meeting'}
              <span style="display: inline-block; padding: 2px 8px; background-color: ${meeting.status === 'CONFIRMED' ? '#dcfce7' : '#fef9c3'}; color: ${meeting.status === 'CONFIRMED' ? '#166534' : '#854d0e'}; border-radius: 9999px; font-size: 12px; margin-left: 8px;">
                ${meeting.status}
              </span>
            </div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
              ⏰ ${startTime} - ${endTime}
            </div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
              ${meeting.type === 'VIRTUAL' ? '💻' : '📍'} ${meeting.type === 'VIRTUAL' ? 'Virtual Meeting' : meeting.location || 'In-Person'}
            </div>
            ${otherPerson ? `
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                👤 With: ${otherPerson.name}
              </div>
            ` : ''}
            ${meeting.type === 'VIRTUAL' && meeting.meetingUrl ? `
              <div style="margin-top: 8px;">
                <a href="${meeting.meetingUrl}" style="color: #2563eb; text-decoration: none; font-weight: 500;">🔗 Join Meeting</a>
              </div>
            ` : ''}
            <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 8px; font-size: 14px; color: #4b5563;">
              <strong>Agenda:</strong> ${agenda}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(to right, #2563eb, #1d4ed8); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📅 Daily Brief</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">${format(date, 'EEEE, MMMM d, yyyy')}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 18px;">Good morning, ${user.name}! 👋</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 14px;">
                You have <strong>${meetings.length} meeting${meetings.length > 1 ? 's' : ''}</strong> scheduled for today. Here's your agenda:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${meetingsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
                You'll receive reminders 1 hour before each meeting.<br>
                Have a productive day! 🚀
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `.trim();
  }

  /**
   * Format email content as HTML
   */
  private formatEmailHTML(content: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333333; margin-bottom: 20px;">${content.subject}</h2>
          <div style="color: #666666; line-height: 1.6; white-space: pre-line;">
            ${content.body}
          </div>
          ${content.meetingUrl ? `
            <div style="margin-top: 30px; text-align: center;">
              <a href="${content.meetingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Meeting</a>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `.trim();
  }
}
