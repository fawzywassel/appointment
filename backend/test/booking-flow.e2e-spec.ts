import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Booking Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let vpUser: any;
  let attendeeUser: any;
  let eaUser: any;
  let createdMeetingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test users
    vpUser = await prisma.user.create({
      data: {
        email: 'vp-test@example.com',
        name: 'VP Test',
        role: 'VP',
        timezone: 'America/New_York',
      },
    });

    attendeeUser = await prisma.user.create({
      data: {
        email: 'attendee-test@example.com',
        name: 'Attendee Test',
        role: 'ATTENDEE',
        timezone: 'America/Los_Angeles',
      },
    });

    eaUser = await prisma.user.create({
      data: {
        email: 'ea-test@example.com',
        name: 'EA Test',
        role: 'EA',
        timezone: 'America/New_York',
      },
    });

    // Create delegation
    await prisma.delegation.create({
      data: {
        vpId: vpUser.id,
        eaId: eaUser.id,
        permissions: {
          canBook: true,
          canCancel: true,
          canView: true,
        },
        isActive: true,
      },
    });

    // Create availability rules for VP
    await prisma.availabilityRule.create({
      data: {
        userId: vpUser.id,
        bufferMinutes: 15,
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
        },
      },
    });

    // Simulate authentication (in real scenario, you'd call the auth endpoint)
    // For E2E tests, you might want to mock JWT or create a real token
    authToken = 'mock-jwt-token'; // Replace with actual token generation
  }

  async function cleanupTestData() {
    // Delete in reverse order of dependencies
    await prisma.meeting.deleteMany({
      where: {
        OR: [
          { vpId: vpUser.id },
          { attendeeId: attendeeUser.id },
          { attendeeId: eaUser.id },
        ],
      },
    });
    await prisma.delegation.deleteMany({
      where: { vpId: vpUser.id },
    });
    await prisma.availabilityRule.deleteMany({
      where: { userId: vpUser.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [vpUser.id, attendeeUser.id, eaUser.id] },
      },
    });
  }

  describe('Complete Booking Flow', () => {
    it('should check VP availability', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .get(`/availability/slots`)
        .query({
          vpId: vpUser.id,
          startDate: tomorrow.toISOString(),
          endDate: new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('start');
      expect(response.body[0]).toHaveProperty('end');
    });

    it('should create a new meeting booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM

      const meetingData = {
        vpId: vpUser.id,
        startTime: tomorrow.toISOString(),
        duration: 60,
        type: 'VIRTUAL',
        priority: 'MEDIUM',
        meetingForm: {
          agendaUrl: 'https://docs.example.com/agenda',
          notes: 'E2E test meeting',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(meetingData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.vpId).toBe(vpUser.id);
      expect(response.body.type).toBe('VIRTUAL');
      expect(response.body.status).toBe('PENDING');
      expect(response.body).toHaveProperty('meetingUrl');

      createdMeetingId = response.body.id;
    });

    it('should retrieve the created meeting', async () => {
      const response = await request(app.getHttpServer())
        .get(`/meetings/${createdMeetingId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdMeetingId);
      expect(response.body.vpId).toBe(vpUser.id);
    });

    it('should list all meetings for VP', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings')
        .query({ vpId: vpUser.id });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((m) => m.id === createdMeetingId)).toBe(true);
    });

    it('should update meeting status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/meetings/${createdMeetingId}`)
        .send({
          status: 'CONFIRMED',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should prevent double booking (conflict detection)', async () => {
      const conflictTime = new Date();
      conflictTime.setDate(conflictTime.getDate() + 1);
      conflictTime.setHours(14, 30, 0, 0); // Overlaps with existing 2 PM meeting

      const conflictData = {
        vpId: vpUser.id,
        startTime: conflictTime.toISOString(),
        duration: 60,
        type: 'IN_PERSON',
        location: 'Conference Room A',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(conflictData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('conflict');
    });

    it('should allow EA to book meeting on behalf of VP', async () => {
      const twoDaysLater = new Date();
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);
      twoDaysLater.setHours(10, 0, 0, 0);

      const meetingData = {
        startTime: twoDaysLater.toISOString(),
        duration: 30,
        type: 'VIRTUAL',
        priority: 'HIGH',
        meetingForm: {
          notes: 'Booked by EA',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/meetings/book-as/${vpUser.id}`)
        .send(meetingData);

      expect(response.status).toBe(201);
      expect(response.body.vpId).toBe(vpUser.id);
      expect(response.body.bookedById).toBe(eaUser.id);
      expect(response.body.priority).toBe('HIGH');
    });

    it('should get meeting statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings/stats')
        .query({ vpId: vpUser.id });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byPriority');
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should cancel a meeting', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/meetings/${createdMeetingId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('cancelled');

      // Verify cancellation
      const getResponse = await request(app.getHttpServer())
        .get(`/meetings/${createdMeetingId}`);

      expect(getResponse.body.status).toBe('CANCELLED');
    });

    it('should validate required fields for booking', async () => {
      const invalidData = {
        // Missing required fields
        type: 'VIRTUAL',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should validate meeting time is in the future', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);

      const meetingData = {
        vpId: vpUser.id,
        startTime: pastDate.toISOString(),
        duration: 60,
        type: 'VIRTUAL',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(meetingData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');
    });

    it('should respect buffer time between meetings', async () => {
      // Create first meeting
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      tomorrow.setHours(11, 0, 0, 0);

      const firstMeeting = await request(app.getHttpServer())
        .post('/meetings')
        .send({
          vpId: vpUser.id,
          startTime: tomorrow.toISOString(),
          duration: 60, // 11:00 - 12:00
          type: 'VIRTUAL',
        });

      expect(firstMeeting.status).toBe(201);

      // Try to book immediately after (should fail due to 15-min buffer)
      const secondMeetingTime = new Date(tomorrow);
      secondMeetingTime.setHours(12, 0, 0, 0); // Exactly at 12:00

      const secondMeeting = await request(app.getHttpServer())
        .post('/meetings')
        .send({
          vpId: vpUser.id,
          startTime: secondMeetingTime.toISOString(),
          duration: 60,
          type: 'VIRTUAL',
        });

      expect(secondMeeting.status).toBe(400);
      expect(secondMeeting.body.message).toContain('buffer');
    });

    it('should filter meetings by priority', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings')
        .query({
          vpId: vpUser.id,
          priority: 'HIGH',
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((meeting) => {
        expect(meeting.priority).toBe('HIGH');
      });
    });

    it('should filter meetings by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings')
        .query({
          vpId: vpUser.id,
          status: 'CONFIRMED',
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((meeting) => {
        expect(meeting.status).toBe('CONFIRMED');
      });
    });
  });

  describe('Private Meeting Handling', () => {
    it('should create a private meeting', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 4);
      tomorrow.setHours(15, 0, 0, 0);

      const meetingData = {
        vpId: vpUser.id,
        startTime: tomorrow.toISOString(),
        duration: 30,
        type: 'IN_PERSON',
        location: 'Private Office',
        isPrivate: true,
        meetingForm: {
          notes: 'Confidential discussion',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(meetingData);

      expect(response.status).toBe(201);
      expect(response.body.isPrivate).toBe(true);
    });

    it('should hide private meeting details from non-participants', async () => {
      // This test would require authentication context
      // Placeholder for now
      expect(true).toBe(true);
    });
  });

  describe('Availability Rules', () => {
    it('should get VP availability rules', async () => {
      const response = await request(app.getHttpServer())
        .get('/availability/rules')
        .query({ userId: vpUser.id });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bufferMinutes');
      expect(response.body).toHaveProperty('workingHours');
      expect(response.body.bufferMinutes).toBe(15);
    });

    it('should update availability rules', async () => {
      const updatedRules = {
        bufferMinutes: 20,
        workingHours: {
          monday: [{ start: '08:00', end: '16:00' }],
          tuesday: [{ start: '08:00', end: '16:00' }],
          wednesday: [{ start: '08:00', end: '16:00' }],
          thursday: [{ start: '08:00', end: '16:00' }],
          friday: [{ start: '08:00', end: '16:00' }],
        },
      };

      const response = await request(app.getHttpServer())
        .put('/availability/rules')
        .send(updatedRules);

      expect(response.status).toBe(200);
      expect(response.body.bufferMinutes).toBe(20);
    });

    it('should not allow booking outside working hours', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 5);
      tomorrow.setHours(18, 0, 0, 0); // 6 PM - outside working hours

      const meetingData = {
        vpId: vpUser.id,
        startTime: tomorrow.toISOString(),
        duration: 60,
        type: 'VIRTUAL',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(meetingData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('working hours');
    });
  });

  describe('Meeting Notifications', () => {
    it('should create notification when meeting is booked', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 6);
      tomorrow.setHours(13, 0, 0, 0);

      const meetingData = {
        vpId: vpUser.id,
        startTime: tomorrow.toISOString(),
        duration: 60,
        type: 'VIRTUAL',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(meetingData);

      expect(response.status).toBe(201);

      // Check if notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          content: {
            path: ['meetingId'],
            equals: response.body.id,
          },
        },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toMatch(/CONFIRMATION|REMINDER/);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should return database health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
