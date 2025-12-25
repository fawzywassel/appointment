import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateMeetingDto, UpdateMeetingDto, PublicBookingDto, MeetingFilterDto, BookAsVpDto } from './dto/meeting.dto';
import { UserRole } from '@prisma/client';

@Controller('meetings')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  /**
   * Create a new meeting (authenticated)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createMeeting(
    @Body() dto: CreateMeetingDto,
    @CurrentUser() user: any,
  ) {
    return this.meetingsService.createMeeting(dto, user.id);
  }

  /**
   * Book meeting as VP (EA proxy booking)
   */
  @Post('book-as/:vpId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EA, UserRole.ADMIN)
  async bookAsVp(
    @Param('vpId') vpId: string,
    @Body() dto: BookAsVpDto,
    @CurrentUser() user: any,
  ) {
    return this.meetingsService.bookAsVp(vpId, dto, user.id);
  }

  /**
   * Public booking endpoint (no auth required)
   */
  @Post('book/:vpId')
  async publicBooking(
    @Param('vpId') vpId: string,
    @Body() dto: PublicBookingDto,
  ) {
    return this.meetingsService.publicBooking(vpId, dto);
  }

  /**
   * Get user's meetings with filters
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMeetings(
    @Query() filters: MeetingFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.meetingsService.getMeetings(user.id, filters);
  }

  /**
   * Get meeting statistics
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser() user: any) {
    return this.meetingsService.getStats(user.id);
  }

  /**
   * Get meeting by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMeetingById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.meetingsService.getMeetingById(id, user.id);
  }

  /**
   * Update meeting
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateMeeting(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: any,
  ) {
    return this.meetingsService.updateMeeting(id, dto, user.id);
  }

  /**
   * Cancel meeting
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelMeeting(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.meetingsService.cancelMeeting(id, user.id);
  }
}
