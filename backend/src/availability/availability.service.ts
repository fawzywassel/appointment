import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { TimezoneUtil } from '../common/utils/timezone.util';
import { addMinutes, startOfDay, addDays, format } from 'date-fns';

interface WorkingHours {
  [key: string]: { start: string; end: string }[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
  ) { }

  /**
   * Get or create availability rules for user
   */
  async getAvailabilityRules(userId: string) {
    let rules = await this.prisma.availabilityRule.findUnique({
      where: { userId },
    });

    if (!rules) {
      // Create default rules
      const defaultWorkingHours: WorkingHours = {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [],
        sunday: [],
      };

      rules = await this.prisma.availabilityRule.create({
        data: {
          userId,
          bufferMinutes: 15,
          workingHours: defaultWorkingHours,
        },
      });
    }

    return rules;
  }

  /**
   * Update availability rules
   */
  async updateAvailabilityRules(
    userId: string,
    bufferMinutes?: number,
    workingHours?: WorkingHours,
  ) {
    const data: any = {};
    if (bufferMinutes !== undefined) data.bufferMinutes = bufferMinutes;
    if (workingHours !== undefined) data.workingHours = workingHours;

    return this.prisma.availabilityRule.upsert({
      where: { userId },
      create: {
        userId,
        bufferMinutes: bufferMinutes ?? 15,
        workingHours: workingHours ?? {},
      },
      update: data,
    });
  }

  /**
   * Get available time slots for a user
   */
  async getAvailableSlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 30,
    timezone: string = 'UTC',
  ): Promise<TimeSlot[]> {
    const rules = await this.getAvailabilityRules(userId);
    const workingHours = rules.workingHours as WorkingHours;
    const bufferMinutes = rules.bufferMinutes;

    const slots: TimeSlot[] = [];
    let currentDay = startOfDay(startDate);

    while (currentDay <= endDate) {
      const dayName = format(currentDay, 'EEEE').toLowerCase();
      const dayWorkingHours = workingHours[dayName] || [];

      for (const period of dayWorkingHours) {
        const periodStart = TimezoneUtil.parseTimeString(period.start, currentDay);
        const periodEnd = TimezoneUtil.parseTimeString(period.end, currentDay);

        let slotStart = periodStart;

        while (slotStart < periodEnd) {
          const slotEnd = addMinutes(slotStart, slotDurationMinutes);

          if (slotEnd <= periodEnd) {
            // Check for conflicts
            const hasConflict = await this.calendarService.hasConflict(
              userId,
              slotStart,
              slotEnd,
              bufferMinutes,
            );

            slots.push({
              start: slotStart,
              end: slotEnd,
              available: !hasConflict,
            });
          }

          slotStart = addMinutes(slotStart, slotDurationMinutes);
        }
      }

      currentDay = addDays(currentDay, 1);
    }

    return slots;
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const rules = await this.getAvailabilityRules(userId);
    const workingHours = rules.workingHours as WorkingHours;

    // Get user timezone
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = user?.timezone || 'UTC';

    // Convert start time to user's timezone
    const zonedStartTime = TimezoneUtil.utcToTimezone(startTime, timezone);
    const dayName = format(zonedStartTime, 'EEEE').toLowerCase();
    const dayWorkingHours = workingHours[dayName] || [];

    // Check if time is within working hours
    const timeStr = format(zonedStartTime, 'HH:mm');
    let withinWorkingHours = false;

    for (const period of dayWorkingHours) {
      if (timeStr >= period.start && timeStr <= period.end) {
        withinWorkingHours = true;
        break;
      }
    }

    if (!withinWorkingHours) {
      return false;
    }

    // Check for conflicts
    const hasConflict = await this.calendarService.hasConflict(
      userId,
      startTime,
      endTime,
      rules.bufferMinutes,
    );

    return !hasConflict;
  }
}
