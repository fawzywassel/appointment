import { Controller, Get, Post, Delete, Query, UseGuards, Param } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CalendarProvider } from '@prisma/client';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  /**
   * Get calendar OAuth URL
   */
  @Get('connect/:provider')
  async getConnectUrl(
    @Param('provider') provider: string,
    @CurrentUser() user: any,
  ) {
    const calendarProvider =
      provider.toUpperCase() as CalendarProvider;

    const authUrl = this.calendarService.getAuthUrl(
      calendarProvider,
      user.id,
    );

    return { authUrl };
  }

  /**
   * OAuth callback handler
   */
  @Get('callback/:provider')
  async handleCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const calendarProvider =
      provider.toUpperCase() as CalendarProvider;

    const connection = await this.calendarService.connectCalendar(
      code,
      state,
      calendarProvider,
    );

    return {
      message: 'Calendar connected successfully',
      connection: {
        id: connection.id,
        provider: connection.provider,
      },
    };
  }

  /**
   * Get user's calendar connections
   */
  @Get('connections')
  async getConnections(@CurrentUser() user: any) {
    return this.calendarService.getConnections(user.id);
  }

  /**
   * Disconnect calendar
   */
  @Delete('disconnect/:provider')
  async disconnectCalendar(
    @Param('provider') provider: string,
    @CurrentUser() user: any,
  ) {
    const calendarProvider =
      provider.toUpperCase() as CalendarProvider;

    await this.calendarService.disconnectCalendar(user.id, calendarProvider);

    return { message: 'Calendar disconnected successfully' };
  }

  /**
   * Get busy times
   */
  @Get('busy-times')
  async getBusyTimes(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const busyTimes = await this.calendarService.getBusyTimes(
      user.id,
      start,
      end,
    );

    return { busyTimes };
  }
}
