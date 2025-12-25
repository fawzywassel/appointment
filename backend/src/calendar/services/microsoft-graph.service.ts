import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CalendarEvent {
  id: string;
  subject: string;
  start: Date;
  end: Date;
  location?: string;
  isPrivate: boolean;
}

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Create Microsoft Graph client with user's access token
   */
  private getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Get OAuth authorization URL for Microsoft
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID');
    const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
    const scopes = 'Calendars.Read Calendars.ReadWrite offline_access';

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string, redirectUri: string): Promise<any> {
    const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID');
    const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'MICROSOFT_CLIENT_SECRET',
    );

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token from Microsoft');
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    const tenantId = this.configService.get<string>('MICROSOFT_TENANT_ID');
    const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'MICROSOFT_CLIENT_SECRET',
    );

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return response.json();
  }

  /**
   * Get calendar events (busy times) from Outlook
   */
  async getCalendarEvents(
    accessToken: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    try {
      const client = this.getClient(accessToken);

      const events = await client
        .api('/me/calendar/calendarView')
        .query({
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          $select: 'subject,start,end,location,sensitivity',
          $orderby: 'start/dateTime',
        })
        .get();

      return events.value.map((event: any) => ({
        id: event.id,
        subject: event.sensitivity === 'private' ? 'Busy' : event.subject,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        location: event.location?.displayName,
        isPrivate: event.sensitivity === 'private',
      }));
    } catch (error) {
      this.logger.error('Failed to fetch calendar events', error);
      throw error;
    }
  }

  /**
   * Get user's primary calendar ID
   */
  async getPrimaryCalendarId(accessToken: string): Promise<string> {
    try {
      const client = this.getClient(accessToken);
      const calendar = await client.api('/me/calendar').get();
      return calendar.id;
    } catch (error) {
      this.logger.error('Failed to get primary calendar', error);
      throw error;
    }
  }

  /**
   * Create calendar event in Outlook
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
      const client = this.getClient(accessToken);

      const newEvent = {
        subject: event.subject,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
        location: event.location
          ? {
              displayName: event.location,
            }
          : undefined,
        body: event.body
          ? {
              contentType: 'text',
              content: event.body,
            }
          : undefined,
      };

      return await client.api('/me/calendar/events').post(newEvent);
    } catch (error) {
      this.logger.error('Failed to create calendar event', error);
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
