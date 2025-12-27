import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { VirtualMeetingService } from './services/virtual-meeting.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarModule } from '../calendar/calendar.module';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, CalendarModule, AvailabilityModule, NotificationsModule, AuthModule],
  providers: [MeetingsService, VirtualMeetingService],
  controllers: [MeetingsController],
  exports: [MeetingsService],
})
export class MeetingsModule { }
