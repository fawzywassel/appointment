import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { AvailabilityService } from '../availability/availability.service';
import { VirtualMeetingService } from './services/virtual-meeting.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMeetingDto, UpdateMeetingDto, PublicBookingDto, MeetingFilterDto, BookAsVpDto } from './dto/meeting.dto';
import { MeetingType, MeetingStatus, MeetingPriority } from '@prisma/client';

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private availabilityService: AvailabilityService,
    private virtualMeetingService: VirtualMeetingService,
    private notificationsService: NotificationsService,
  ) { }

  /**
   * Create a new meeting with conflict validation
   */
  async createMeeting(dto: CreateMeetingDto, createdBy: string) {
    console.log('MeetingsService.createMeeting called by:', createdBy);
    try {
      const startTime = new Date(dto.startTime);
      const endTime = new Date(dto.endTime);

      // Validate time slot
      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for conflicts
      const hasConflict = await this.calendarService.hasConflict(
        dto.vpId,
        startTime,
        endTime,
      );

      if (hasConflict) {
        throw new BadRequestException('Time slot conflicts with existing meeting');
      }

      // Check availability
      const isAvailable = await this.availabilityService.isSlotAvailable(
        dto.vpId,
        startTime,
        endTime,
      );

      if (!isAvailable) {
        throw new BadRequestException('Time slot is outside working hours');
      }

      // Generate meeting URL for virtual meetings
      let meetingUrl: string | null = null;
      if (dto.type === MeetingType.VIRTUAL) {
        meetingUrl = await this.virtualMeetingService.generateMeetingLink(
          'temp-id',
          dto.title || 'Meeting',
          startTime,
          endTime,
        );
      }

      // Resolve attendee if email provided
      let attendeeId = dto.attendeeId;
      if (!attendeeId && dto.attendeeEmail) {
        let attendee = await this.prisma.user.findUnique({
          where: { email: dto.attendeeEmail },
        });

        if (!attendee) {
          attendee = await this.prisma.user.create({
            data: {
              email: dto.attendeeEmail,
              name: dto.attendeeName || dto.attendeeEmail.split('@')[0],
              role: 'ATTENDEE',
              password: '', // No password for invited attendees initially
            },
          });
        }
        attendeeId = attendee.id;
      }

      // Create meeting
      const meeting = await this.prisma.meeting.create({
        data: {
          vpId: dto.vpId,
          attendeeId: attendeeId,
          bookedById: createdBy,
          startTime,
          endTime,
          type: dto.type,
          status: MeetingStatus.PENDING,
          priority: dto.priority || MeetingPriority.MEDIUM,
          location: dto.location,
          meetingUrl,
          title: dto.title,
          isPrivate: dto.isPrivate || false,
        },
        include: {
          vp: { select: { id: true, name: true, email: true } },
          attendee: { select: { id: true, name: true, email: true } },
          bookedBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Update meeting URL with actual ID
      if (dto.type === MeetingType.VIRTUAL && meetingUrl) {
        const actualUrl = await this.virtualMeetingService.generateMeetingLink(
          meeting.id,
          meeting.title || 'Meeting',
          startTime,
          endTime,
        );
        await this.prisma.meeting.update({
          where: { id: meeting.id },
          data: { meetingUrl: actualUrl },
        });
      }

      // Create meeting form if agenda/notes provided
      if (dto.agenda || dto.notes) {
        await this.prisma.meetingForm.create({
          data: {
            meetingId: meeting.id,
            agendaUrl: dto.agenda,
            notes: dto.notes,
          },
        });
      }

      // Send confirmation and schedule reminder
      await this.notificationsService.sendMeetingConfirmation(meeting);
      await this.notificationsService.scheduleMeetingReminder(meeting);

      return meeting;
    } catch (error) {
      console.error('MeetingsService.createMeeting failed:', error);
      throw error;
    }
  }

  /**
   * Public booking endpoint
   */
  async publicBooking(vpId: string, dto: PublicBookingDto) {
    // Find or create attendee user
    let attendee = await this.prisma.user.findUnique({
      where: { email: dto.attendeeEmail },
    });

    if (!attendee) {
      attendee = await this.prisma.user.create({
        data: {
          email: dto.attendeeEmail,
          name: dto.attendeeName,
          role: 'ATTENDEE',
        },
      });
    }

    // Create meeting
    const createDto: CreateMeetingDto = {
      vpId,
      attendeeId: attendee.id,
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type,
      agenda: dto.agenda,
      notes: dto.notes,
    };

    return this.createMeeting(createDto, attendee.id);
  }

  /**
   * Book meeting as VP (EA proxy booking)
   */
  async bookAsVp(vpId: string, dto: BookAsVpDto, eaId: string) {
    // Check if EA has delegation permission to book for this VP
    const delegation = await this.prisma.delegation.findFirst({
      where: {
        vpId,
        eaId,
        isActive: true,
      },
    });

    if (!delegation) {
      throw new ForbiddenException('No delegation found for this VP');
    }

    const permissions = delegation.permissions as any;
    if (!permissions.canBook) {
      throw new ForbiddenException('No permission to book meetings for this VP');
    }

    // Find or create attendee user
    let attendee = await this.prisma.user.findUnique({
      where: { email: dto.attendeeEmail },
    });

    if (!attendee) {
      attendee = await this.prisma.user.create({
        data: {
          email: dto.attendeeEmail,
          name: dto.attendeeName,
          role: 'ATTENDEE',
        },
      });
    }

    // Create meeting
    const createDto: CreateMeetingDto = {
      vpId,
      attendeeId: attendee.id,
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type,
      location: dto.location,
      title: dto.title,
      priority: dto.priority,
      agenda: dto.agenda,
      notes: dto.notes,
    };

    return this.createMeeting(createDto, eaId);
  }

  /**
   * Get meetings with filters
   */
  async getMeetings(userId: string, filters: MeetingFilterDto) {
    const where: any = {
      OR: [
        { vpId: userId },
        { attendeeId: userId },
      ],
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startTime.lte = new Date(filters.endDate);
      }
    }

    if (filters.attendeeId) {
      where.attendeeId = filters.attendeeId;
    }

    if (filters.isPrivate !== undefined) {
      where.isPrivate = filters.isPrivate;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    return this.prisma.meeting.findMany({
      where,
      include: {
        vp: { select: { id: true, name: true, email: true } },
        attendee: { select: { id: true, name: true, email: true } },
        bookedBy: { select: { id: true, name: true, email: true } },
        meetingForm: true,
      },
      orderBy: [{ priority: 'desc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(id: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        vp: { select: { id: true, name: true, email: true } },
        attendee: { select: { id: true, name: true, email: true } },
        meetingForm: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Check access
    if (meeting.vpId !== userId && meeting.attendeeId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return meeting;
  }

  /**
   * Update meeting
   */
  async updateMeeting(id: string, dto: UpdateMeetingDto, userId: string) {
    const meeting = await this.getMeetingById(id, userId);

    // Only VP can update
    if (meeting.vpId !== userId) {
      throw new ForbiddenException('Only the VP can update this meeting');
    }

    const updateData: any = {};

    if (dto.startTime || dto.endTime) {
      const startTime = dto.startTime ? new Date(dto.startTime) : meeting.startTime;
      const endTime = dto.endTime ? new Date(dto.endTime) : meeting.endTime;

      // Validate and check conflicts if time changed
      if (startTime.getTime() !== meeting.startTime.getTime() ||
        endTime.getTime() !== meeting.endTime.getTime()) {
        const hasConflict = await this.calendarService.hasConflict(
          meeting.vpId,
          startTime,
          endTime,
        );

        if (hasConflict) {
          throw new BadRequestException('New time conflicts with existing meeting');
        }
      }

      updateData.startTime = startTime;
      updateData.endTime = endTime;
    }

    if (dto.type) updateData.type = dto.type;
    if (dto.location) updateData.location = dto.location;
    if (dto.title) updateData.title = dto.title;
    if (dto.status) updateData.status = dto.status;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;

    // Update meeting form if provided
    if (dto.agenda || dto.notes) {
      await this.prisma.meetingForm.upsert({
        where: { meetingId: id },
        create: {
          meetingId: id,
          agendaUrl: dto.agenda,
          notes: dto.notes,
        },
        update: {
          agendaUrl: dto.agenda,
          notes: dto.notes,
        },
      });
    }

    return this.prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        vp: { select: { id: true, name: true, email: true } },
        attendee: { select: { id: true, name: true, email: true } },
        meetingForm: true,
      },
    });
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(id: string, userId: string) {
    const meeting = await this.getMeetingById(id, userId);

    // Both VP and attendee can cancel
    if (meeting.vpId !== userId && meeting.attendeeId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Cancel virtual meeting if applicable
    if (meeting.type === MeetingType.VIRTUAL && meeting.meetingUrl) {
      await this.virtualMeetingService.cancelMeeting(meeting.meetingUrl);
    }

    const cancelledMeeting = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.CANCELLED },
    });

    // Send cancellation notification
    await this.notificationsService.sendCancellationNotification(cancelledMeeting);

    return cancelledMeeting;
  }

  /**
   * Get meeting statistics
   */
  async getStats(userId: string) {
    const [total, pending, confirmed, cancelled, upcoming] = await Promise.all([
      this.prisma.meeting.count({ where: { vpId: userId } }),
      this.prisma.meeting.count({ where: { vpId: userId, status: MeetingStatus.PENDING } }),
      this.prisma.meeting.count({ where: { vpId: userId, status: MeetingStatus.CONFIRMED } }),
      this.prisma.meeting.count({ where: { vpId: userId, status: MeetingStatus.CANCELLED } }),
      this.prisma.meeting.count({
        where: {
          vpId: userId,
          startTime: { gte: new Date() },
          status: { in: [MeetingStatus.PENDING, MeetingStatus.CONFIRMED] },
        },
      }),
    ]);

    return {
      total,
      pending,
      confirmed,
      cancelled,
      upcoming,
    };
  }
}
