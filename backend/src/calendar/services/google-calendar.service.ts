import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarEvent } from './microsoft-graph.service';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  /**
   * Get OAuth authorization URL for Google
   */
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: state,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getAccessToken(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      this.logger.error('Failed to get access token from Google', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      this.logger.error('Failed to refresh Google access token', error);
      throw error;
    }
  }

  /**
   * Get calendar events from Google Calendar
   */
  async getCalendarEvents(
    accessToken: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      return events.map((event: calendar_v3.Schema$Event) => ({
        id: event.id!,
        subject: event.visibility === 'private' ? 'Busy' : (event.summary || 'No title'),
        start: new Date(event.start?.dateTime || event.start?.date!),
        end: new Date(event.end?.dateTime || event.end?.date!),
        location: event.location,
        isPrivate: event.visibility === 'private',
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Google calendar events', error);
      throw error;
    }
  }

  /**
   * Get primary calendar ID
   */
  async getPrimaryCalendarId(accessToken: string): Promise<string> {
    return 'primary'; // Google uses 'primary' for the main calendar
  }

  /**
   * Create calendar event in Google Calendar
   */
  async createCalendarEvent(
    accessToken: string,
    event: {
      subject: string;
      start: Date;
      end: Date;
      location?: string;
      body?: string;
    },
  ): Promise<any> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const googleEvent: calendar_v3.Schema$Event = {
        summary: event.subject,
        description: event.body,
        location: event.location,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Google calendar event', error);
      throw error;
    }
  }

  /**
   * Get busy times for availability check
   */
  async getBusyTimes(
    accessToken: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ start: Date; end: Date }[]> {
    const events = await this.getCalendarEvents(accessToken, startDate, endDate);
    return events.map((event) => ({
      start: event.start,
      end: event.end,
    }));
  }
}
