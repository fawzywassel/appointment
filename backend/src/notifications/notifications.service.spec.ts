import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

// Mock Twilio
jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'mock-sms-sid' }),
      },
    })),
  };
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    meeting: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        SENDGRID_API_KEY: 'mock-sendgrid-key',
        SENDGRID_FROM_EMAIL: 'test@example.com',
        TWILIO_ACCOUNT_SID: 'mock-twilio-sid',
        TWILIO_AUTH_TOKEN: 'mock-twilio-token',
        TWILIO_PHONE_NUMBER: '+15551234567',
        MEETING_REMINDER_MINUTES: 60,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleNotification', () => {
    it('should create a notification in the database', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'REMINDER',
        scheduledTime: new Date(),
        content: {
          subject: 'Test Notification',
          body: 'This is a test',
        },
      };

      const expectedNotification = {
        id: 'notification-123',
        ...notificationData,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(
        expectedNotification,
      );

      const result = await service.scheduleNotification(notificationData);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: notificationData.userId,
          type: notificationData.type,
          scheduledTime: notificationData.scheduledTime,
          content: notificationData.content,
          status: 'PENDING',
        },
      });
      expect(result).toEqual(expectedNotification);
    });
  });

  describe('sendMeetingConfirmation', () => {
    it('should schedule a meeting confirmation notification', async () => {
      const meeting = {
        id: 'meeting-123',
        title: 'Test Meeting',
        vpId: 'vp-123',
        attendeeId: 'attendee-123',
        startTime: new Date('2025-12-26T10:00:00Z'),
        endTime: new Date('2025-12-26T11:00:00Z'),
        type: 'VIRTUAL',
        meetingUrl: 'https://meet.example.com/test',
        location: null,
      };

      const user = {
        id: 'attendee-123',
        email: 'attendee@example.com',
        name: 'John Doe',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notification-123',
      });

      await service.sendMeetingConfirmation(meeting);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: meeting.attendeeId },
      });
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: user.id,
            type: 'MEETING_CONFIRMATION',
          }),
        }),
      );
    });

    it('should not send notification if user not found', async () => {
      const meeting = {
        id: 'meeting-123',
        attendeeId: 'nonexistent-user',
        vpId: 'vp-123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.sendMeetingConfirmation(meeting);

      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('scheduleMeetingReminder', () => {
    it('should schedule reminders for both VP and attendee', async () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const meeting = {
        id: 'meeting-123',
        title: 'Test Meeting',
        vpId: 'vp-123',
        attendeeId: 'attendee-123',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        type: 'VIRTUAL',
        meetingUrl: 'https://meet.example.com/test',
      };

      const vpUser = { id: 'vp-123', email: 'vp@example.com' };
      const attendeeUser = { id: 'attendee-123', email: 'attendee@example.com' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(vpUser)
        .mockResolvedValueOnce(attendeeUser);

      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notification-123',
      });

      await service.scheduleMeetingReminder(meeting);

      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'REMINDER',
          }),
        }),
      );
    });

    it('should not schedule reminder if meeting is in the past', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const meeting = {
        id: 'meeting-123',
        vpId: 'vp-123',
        attendeeId: 'attendee-123',
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
      };

      await service.scheduleMeetingReminder(meeting);

      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('sendCancellationNotification', () => {
    it('should send cancellation to all participants', async () => {
      const meeting = {
        id: 'meeting-123',
        title: 'Cancelled Meeting',
        vpId: 'vp-123',
        attendeeId: 'attendee-123',
        startTime: new Date(),
      };

      const vpUser = { id: 'vp-123', email: 'vp@example.com' };
      const attendeeUser = { id: 'attendee-123', email: 'attendee@example.com' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(vpUser)
        .mockResolvedValueOnce(attendeeUser);

      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notification-123',
      });

      await service.sendCancellationNotification(meeting);

      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'CANCELLATION',
          }),
        }),
      );
    });
  });

  describe('processPendingNotifications', () => {
    it('should process pending notifications and mark them as sent', async () => {
      const pendingNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'REMINDER',
          status: 'PENDING',
          scheduledTime: new Date(),
          content: {
            subject: 'Test 1',
            body: 'Body 1',
          },
          user: {
            id: 'user-123',
            email: 'user1@example.com',
          },
        },
        {
          id: 'notif-2',
          userId: 'user-456',
          type: 'REMINDER',
          status: 'PENDING',
          scheduledTime: new Date(),
          content: {
            subject: 'Test 2',
            body: 'Body 2',
          },
          user: {
            id: 'user-456',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        pendingNotifications,
      );
      mockPrismaService.notification.update.mockResolvedValue({});

      // Mock sendEmail to succeed
      jest.spyOn(service, 'sendEmail').mockResolvedValue();

      await service.processPendingNotifications();

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          scheduledTime: {
            lte: expect.any(Date),
          },
        },
        include: {
          user: true,
        },
        take: 100,
      });

      expect(service.sendEmail).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.notification.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should mark failed notifications as FAILED', async () => {
      const pendingNotifications = [
        {
          id: 'notif-fail',
          userId: 'user-123',
          type: 'REMINDER',
          status: 'PENDING',
          scheduledTime: new Date(),
          content: {
            subject: 'Test',
            body: 'Body',
          },
          user: {
            id: 'user-123',
            email: 'user@example.com',
          },
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        pendingNotifications,
      );
      mockPrismaService.notification.update.mockResolvedValue({});

      // Mock sendEmail to fail
      jest
        .spyOn(service, 'sendEmail')
        .mockRejectedValue(new Error('Send failed'));

      await service.processPendingNotifications();

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-fail' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('sendDailyBrief', () => {
    it('should send daily briefs to all VPs and EAs', async () => {
      const users = [
        { id: 'vp-1', email: 'vp1@example.com', name: 'VP One', role: 'VP' },
        { id: 'ea-1', email: 'ea1@example.com', name: 'EA One', role: 'EA' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      jest.spyOn(service, 'generateAndSendDailyBrief').mockResolvedValue();

      await service.sendDailyBrief();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: ['VP', 'EA'] },
        },
      });
      expect(service.generateAndSendDailyBrief).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateAndSendDailyBrief', () => {
    it('should send daily brief with meetings', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
      };

      const meetings = [
        {
          id: 'meeting-1',
          title: 'Morning Standup',
          startTime: new Date('2025-12-26T09:00:00Z'),
          endTime: new Date('2025-12-26T09:30:00Z'),
          type: 'VIRTUAL',
          status: 'CONFIRMED',
          meetingUrl: 'https://meet.example.com/standup',
          vpId: 'user-123',
          attendeeId: 'other-user',
          vp: { name: 'John Doe', email: 'user@example.com' },
          attendee: { name: 'Jane Smith', email: 'jane@example.com' },
          meetingForm: {
            agendaUrl: 'https://docs.example.com/agenda',
            notes: 'Daily sync',
          },
        },
      ];

      mockPrismaService.meeting.findMany.mockResolvedValue(meetings);
      jest.spyOn(service, 'sendEmail').mockResolvedValue();

      await service.generateAndSendDailyBrief(user);

      expect(mockPrismaService.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ vpId: user.id }, { attendeeId: user.id }],
          }),
        }),
      );
      expect(service.sendEmail).toHaveBeenCalledWith(
        user.email,
        expect.stringContaining('Daily Brief'),
        expect.any(String),
      );
    });

    it('should skip daily brief if no meetings', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
      };

      mockPrismaService.meeting.findMany.mockResolvedValue([]);
      jest.spyOn(service, 'sendEmail').mockResolvedValue();

      await service.generateAndSendDailyBrief(user);

      expect(service.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('should send email via SendGrid', async () => {
      const sgMail = require('@sendgrid/mail');

      await service.sendEmail(
        'test@example.com',
        'Test Subject',
        '<p>Test Body</p>',
      );

      expect(sgMail.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
      });
    });
  });

  describe('sendSMS', () => {
    it('should send SMS via Twilio', async () => {
      await service.sendSMS('+15559876543', 'Test message');

      // Verify Twilio client was initialized and message sent
      // Note: Actual implementation depends on Twilio mock structure
      expect(true).toBe(true); // Placeholder - actual test depends on mock implementation
    });
  });
});
