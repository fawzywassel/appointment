import { Controller, Get, Put, Body, UseGuards, Query, Param } from '@nestjs/common';
import { AvailabilityService, TimeSlot } from './availability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) { }

  /**
   * Get availability rules
   */
  @Get('rules')
  async getRules(@CurrentUser() user: any) {
    return this.availabilityService.getAvailabilityRules(user.id);
  }

  /**
   * Update availability rules
   */
  @Put('rules')
  async updateRules(
    @CurrentUser() user: any,
    @Body() body: { bufferMinutes?: number; workingHours?: any },
  ) {
    return this.availabilityService.updateAvailabilityRules(
      user.id,
      body.bufferMinutes,
      body.workingHours,
    );
  }

  /**
   * Get available time slots
   */
  @Get('slots')
  async getSlots(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('duration') duration: string,
    @Query('userId') userId: string,
    @Query('timezone') timezone: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMinutes = parseInt(duration) || 30;

    const slots = await this.availabilityService.getAvailableSlots(
      userId,
      start,
      end,
      durationMinutes,
      timezone || 'UTC',
    );

    return { slots };
  }

  /**
   * Check if slot is available
   */
  @Get('check')
  async checkSlot(
    @Query('userId') userId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const available = await this.availabilityService.isSlotAvailable(
      userId,
      start,
      end,
    );

    return { available };
  }

  /**
   * Get availability for a specific VP (public endpoint for booking)
   */
  @Get(':vpId/slots')
  async getVpSlots(
    @Param('vpId') vpId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('duration') duration: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMinutes = parseInt(duration) || 30;

    const slots = await this.availabilityService.getAvailableSlots(
      vpId,
      start,
      end,
      durationMinutes,
    );

    // Filter to only return available slots
    const availableSlots = slots.filter((slot) => slot.available);

    return { slots: availableSlots };
  }
}
