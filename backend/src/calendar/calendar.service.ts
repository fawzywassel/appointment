import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MicrosoftGraphService } from './services/microsoft-graph.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { CalendarProvider } from '@prisma/client';
import { TimezoneUtil } from '../common/utils/timezone.util';
import { addDays } from 'date-fns';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private microsoftGraphService: MicrosoftGraphService,
    private googleCalendarService: GoogleCalendarService,
  ) { }

  /**
   * Get authorization URL for calendar provider
   */
  getAuthUrl(provider: CalendarProvider, userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, provider })).toString('base64');

    if (provider === CalendarProvider.OUTLOOK) {
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI!;
      return this.microsoftGraphService.getAuthUrl(redirectUri, state);
    } else if (provider === CalendarProvider.GOOGLE) {
      return this.googleCalendarService.getAuthUrl(state);
    }

    throw new BadRequestException('Unsupported calendar provider');
  }

  /**
   * Connect calendar with OAuth callback
   */
  async connectCalendar(
    code: string,
    state: string,
    provider: CalendarProvider,
  ): Promise<any> {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    let tokens: any;
    let calendarId: string;

    if (provider === CalendarProvider.OUTLOOK) {
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI!;
      tokens = await this.microsoftGraphService.getAccessToken(code, redirectUri);
      calendarId = await this.microsoftGraphService.getPrimaryCalendarId(tokens.access_token);
    } else if (provider === CalendarProvider.GOOGLE) {
      tokens = await this.googleCalendarService.getAccessToken(code);
      calendarId = await this.googleCalendarService.getPrimaryCalendarId(tokens.access_token);
    } else {
      throw new BadRequestException('Unsupported calendar provider');
    }

    // Store calendar connection
    const connection = await this.prisma.calendarConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      create: {
        userId,
        provider,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        calendarId,
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        calendarId,
        isActive: true,
      },
    });

    return connection;
  }

  /**
   * Disconnect calendar
   */
  async disconnectCalendar(userId: string, provider: CalendarProvider): Promise<void> {
    await this.prisma.calendarConnection.updateMany({
      where: { userId, provider },
      data: { isActive: false },
    });
  }

  /**
   * Get user's calendar connections
   */
  async getConnections(userId: string) {
    const connections = await this.prisma.calendarConnection.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        provider: true,
        calendarId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Map to frontend format
    return connections.map(conn => ({
      id: conn.id,
      provider: conn.provider,
      email: conn.calendarId, // Using calendarId as email placeholder
      connected: true,
      lastSyncedAt: conn.updatedAt?.toISOString(),
    }));
  }

  /**
   * Get busy times from all connected calendars
   */
  async getBusyTimes(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ start: Date; end: Date }[]> {
    const connections = await this.prisma.calendarConnection.findMany({
      where: { userId, isActive: true },
    });

    const busyTimes: { start: Date; end: Date }[] = [];

    for (const connection of connections) {
      try {
        let times: { start: Date; end: Date }[];

        if (connection.provider === CalendarProvider.OUTLOOK) {
          times = await this.microsoftGraphService.getBusyTimes(
            connection.accessToken,
            startDate,
            endDate,
          );
        } else if (connection.provider === CalendarProvider.GOOGLE) {
          times = await this.googleCalendarService.getBusyTimes(
            connection.accessToken,
            startDate,
            endDate,
          );
        } else {
          continue;
        }

        busyTimes.push(...times);
      } catch (error) {
        // If token expired, try to refresh
        if (connection.refreshToken) {
          await this.refreshToken(connection.id, connection.provider, connection.refreshToken);
        }
      }
    }

    return busyTimes;
  }

  /**
   * Check if a time slot conflicts with existing meetings
   */
  async hasConflict(
    userId: string,
    startTime: Date,
    endTime: Date,
    bufferMinutes: number = 15,
  ): Promise<boolean> {
    // Add buffer to both start and end
    const bufferedStart = TimezoneUtil.addBuffer(startTime, -bufferMinutes);
    const bufferedEnd = TimezoneUtil.addBuffer(endTime, bufferMinutes);

    // Check against external calendars
    const busyTimes = await this.getBusyTimes(
      userId,
      bufferedStart,
      bufferedEnd,
    );

    for (const busy of busyTimes) {
      if (TimezoneUtil.doTimeRangesOverlap(bufferedStart, bufferedEnd, busy.start, busy.end)) {
        return true;
      }
    }

    // Check against internal meetings
    const existingMeetings = await this.prisma.meeting.findMany({
      where: {
        vpId: userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: bufferedEnd } },
              { endTime: { gte: bufferedStart } },
            ],
          },
        ],
      },
    });

    return existingMeetings.length > 0;
  }

  /**
   * Refresh calendar access token
   */
  private async refreshToken(
    connectionId: string,
    provider: CalendarProvider,
    refreshToken: string,
  ): Promise<void> {
    try {
      let tokens: any;

      if (provider === CalendarProvider.OUTLOOK) {
        tokens = await this.microsoftGraphService.refreshAccessToken(refreshToken);
      } else if (provider === CalendarProvider.GOOGLE) {
        tokens = await this.googleCalendarService.refreshAccessToken(refreshToken);
      }

      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || refreshToken,
          tokenExpiry: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
        },
      });
    } catch (error) {
      // If refresh fails, mark connection as inactive
      await this.prisma.calendarConnection.update({
        where: { id: connectionId },
        data: { isActive: false },
      });
    }
  }
}
