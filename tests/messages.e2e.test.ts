import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

describe('Messages E2E Tests', () => {
  let user1: any;
  let user1Token: any;
  let user2: any;
  let user2Token: any;
  let conversation: any;
  let testMessage: any;
  let testService: any;
  let category: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.serviceReview.deleteMany();
    await prisma.serviceBooking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.individualKYC.deleteMany();
    await prisma.industrialKYC.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'message-test@',
        },
      },
    });

    // Create first user
    const password1 = await bcrypt.hash('Test1234!@#', 12);
    user1 = await prisma.user.create({
      data: {
        email: 'message-test-user1@example.com',
        password: password1,
        firstName: 'User',
        lastName: 'One',
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create first user KYC
    await prisma.individualKYC.create({
      data: {
        userId: user1.id,
        fullName: 'User One',
        gender: 'Male',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        nationalId: '1111111111',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '1',
        email: 'message-test-user1@example.com',
        phone: '+9771111111111',
        emergencyContact: '+9772222222222',
        highestQualification: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        languagesKnown: ['English', 'Nepali'],
        employmentStatus: 'FULLY_EMPLOYED',
        status: 'APPROVED',
        consentGiven: true,
      },
    });

    // Create second user
    const password2 = await bcrypt.hash('Test1234!@#', 12);
    user2 = await prisma.user.create({
      data: {
        email: 'message-test-user2@example.com',
        password: password2,
        firstName: 'User',
        lastName: 'Two',
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create second user KYC
    await prisma.individualKYC.create({
      data: {
        userId: user2.id,
        fullName: 'User Two',
        gender: 'Female',
        dateOfBirth: '1988-03-15T00:00:00.000Z',
        nationalId: '2222222222',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '2',
        email: 'message-test-user2@example.com',
        phone: '+9773333333333',
        emergencyContact: '+9774444444444',
        highestQualification: 'Master',
        fieldOfStudy: 'Business',
        languagesKnown: ['English', 'Nepali', 'Hindi'],
        employmentStatus: 'LOOKING_NEW',
        status: 'APPROVED',
        consentGiven: true,
      },
    });

    // Create category for service
    category = await prisma.serviceCategory.create({
      data: {
        name: 'Consulting Services',
        description: 'Professional consulting services',
        isActive: true,
      },
    });

    // Create test service
    testService = await prisma.service.create({
      data: {
        providerId: user2.id,
        title: 'Career Counseling Service',
        description: 'Professional career guidance and counseling',
        detailedDescription: 'Comprehensive career counseling including resume review, interview preparation, and career path planning.',
        specifications: 'Resume review, interview prep, career planning',
        standards: 'Professional counseling standards',
        demographics: 'Job seekers, career changers',
        geographics: 'Kathmandu Valley',
        categoryId: category.id,
        priceType: 'HOURLY',
        hourlyRate: 3000,
        negotiable: true,
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        serviceRadius: 20,
        latitude: 27.7172,
        longitude: 85.3240,
        availabilityType: 'FLEXIBLE',
        availableFrom: '10:00',
        availableTo: '16:00',
        workingHours: 'Monday to Saturday, 10 AM to 4 PM',
        businessYears: 2,
        teamSize: 1,
        status: 'APPROVED',
        isActive: true,
        customerSatisfactionScore: 4.6,
      },
    });

    // Login both users
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'message-test-user1@example.com',
        password: 'Test1234!@#',
      });

    user1Token = login1.body.data.tokens.accessToken;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'message-test-user2@example.com',
        password: 'Test1234!@#',
      });

    user2Token = login2.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign keys)
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.serviceReview.deleteMany();
    await prisma.serviceBooking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.individualKYC.deleteMany();
    await prisma.industrialKYC.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'message-test@',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/messages', () => {
    it('should send message and create conversation', async () => {
      const messageData = {
        recipientId: user2.id,
        serviceId: testService.id,
        content: 'Hello! I am interested in your career counseling service.',
        messageType: 'TEXT',
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello! I am interested in your career counseling service.');
      expect(response.body.data.senderId).toBe(user1.id);
      expect(response.body.data.recipientId).toBe(user2.id);
      expect(response.body.data.serviceId).toBe(testService.id);
      expect(response.body.data.conversationId).toBeDefined();

      // Store for other tests
      conversation = { id: response.body.data.conversationId };
      testMessage = response.body.data;
    });

    it('should send reply in existing conversation', async () => {
      const replyData = {
        recipientId: user1.id,
        content: 'Hi! Thank you for your interest. I would be happy to help with career counseling.',
        messageType: 'TEXT',
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(replyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hi! Thank you for your interest. I would be happy to help with career counseling.');
      expect(response.body.data.senderId).toBe(user2.id);
      expect(response.body.data.recipientId).toBe(user1.id);
      expect(response.body.data.conversationId).toBe(conversation.id);
    });

    it('should reject message without authentication', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          recipientId: user2.id,
          content: 'Test message',
        });

      expect(response.status).toBe(401);
    });

    it('should reject message to non-existent user', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipientId: '00000000-0000-0000-0000-000000000000',
          content: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages', () => {
    it('should get messages in conversation', async () => {
      const response = await request(app)
        .get('/api/messages')
        .query({ conversationId: conversation.id, limit: 10 })
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Should have 2 messages

      // Verify messages are in correct order (newest first)
      expect(response.body.data[0].senderId).toBe(user2.id);
      expect(response.body.data[1].senderId).toBe(user1.id);
    });

    it('should paginate messages', async () => {
      const response = await request(app)
        .get('/api/messages')
        .query({ conversationId: conversation.id, limit: 1, page: 1 })
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/messages/conversations', () => {
    it('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify conversation data
      const conv = response.body.data[0];
      expect(conv.id).toBe(conversation.id);
      expect(conv.participants).toContain(user1.id);
      expect(conv.participants).toContain(user2.id);
      expect(conv.lastMessage).toBeDefined();
      expect(conv.unreadCount).toBeDefined();
    });
  });

  describe('GET /api/messages/conversations/:id', () => {
    it('should get conversation by ID', async () => {
      const response = await request(app)
        .get(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(conversation.id);
      expect(response.body.data.participants).toHaveLength(2);
      expect(response.body.data.serviceId).toBe(testService.id);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/messages/conversations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject access to other user conversation', async () => {
      // Create another user for testing access control
      const otherPassword = await bcrypt.hash('Test1234!@#', 12);
      const otherUser = await prisma.user.create({
        data: {
          email: 'message-test-other@example.com',
          password: otherPassword,
          firstName: 'Other',
          lastName: 'User',
          role: 'INDIVIDUAL',
          status: 'ACTIVE',
          isEmailVerified: true,
        },
      });

      await prisma.individualKYC.create({
        data: {
          userId: otherUser.id,
          fullName: 'Other User',
          gender: 'Male',
          dateOfBirth: '1992-07-20T00:00:00.000Z',
          nationalId: '3333333333',
          country: 'Nepal',
          province: 'Bagmati',
          district: 'Kathmandu',
          municipality: 'Kathmandu',
          ward: '3',
          email: 'message-test-other@example.com',
          phone: '+9775555555555',
          emergencyContact: '+9776666666666',
          highestQualification: 'Bachelor',
          fieldOfStudy: 'Engineering',
          languagesKnown: ['English', 'Nepali'],
          employmentStatus: 'FULLY_EMPLOYED',
          status: 'APPROVED',
          consentGiven: true,
        },
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'message-test-other@example.com',
          password: 'Test1234!@#',
        });

      const otherToken = otherLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .get(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Clean up
      await prisma.individualKYC.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('PUT /api/messages/:id', () => {
    it('should update own message', async () => {
      const updateData = {
        content: 'Hello! I am interested in your career counseling service. Could you tell me more about your packages?',
      };

      const response = await request(app)
        .put(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello! I am interested in your career counseling service. Could you tell me more about your packages?');
      expect(response.body.data.isEdited).toBe(true);
    });

    it('should reject update of other user message', async () => {
      const response = await request(app)
        .put(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'This should not work',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should delete own message (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify message is soft deleted
      const checkResponse = await request(app)
        .get('/api/messages')
        .query({ conversationId: conversation.id })
        .set('Authorization', `Bearer ${user1Token}`);

      // Message should not appear in results (soft deleted)
      const deletedMessage = checkResponse.body.data.find((m: any) => m.id === testMessage.id);
      expect(deletedMessage).toBeUndefined();
    });
  });

  describe('PUT /api/messages/mark-read', () => {
    beforeAll(async () => {
      // Create another message for read receipt testing
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          recipientId: user1.id,
          content: 'Sure, I can provide more details about my career counseling packages.',
          messageType: 'TEXT',
        });
    });

    it('should mark messages as read', async () => {
      const response = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          conversationId: conversation.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify conversation shows zero unread count
      const convResponse = await request(app)
        .get(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(convResponse.body.data.unreadCount).toBe(0);
    });
  });

  describe('PUT /api/messages/conversations/:id/archive', () => {
    it('should archive conversation', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}/archive`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          archived: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify conversation is archived
      const convResponse = await request(app)
        .get(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(convResponse.body.data.archivedBy).toContain(user1.id);
    });

    it('should unarchive conversation', async () => {
      const response = await request(app)
        .put(`/api/messages/conversations/${conversation.id}/archive`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          archived: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify conversation is unarchived
      const convResponse = await request(app)
        .get(`/api/messages/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(convResponse.body.data.archivedBy).not.toContain(user1.id);
    });
  });
});
