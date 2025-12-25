import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { MicrosoftGraphService } from './services/microsoft-graph.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CalendarService, MicrosoftGraphService, GoogleCalendarService],
  controllers: [CalendarController],
  exports: [CalendarService],
})
export class CalendarModule {}
