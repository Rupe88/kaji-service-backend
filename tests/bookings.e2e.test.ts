import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

describe('Bookings E2E Tests', () => {
  let industrialUser: any;
  let industrialToken: any;
  let individualUser: any;
  let individualToken: any;
  let testService: any;
  let testBooking: any;
  let category: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.serviceReview.deleteMany();
    await prisma.serviceBooking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.individualKYC.deleteMany();
    await prisma.industrialKYC.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'booking-test@',
        },
      },
    });

    // Create industrial user (service provider)
    const industrialPassword = await bcrypt.hash('Test1234!@#', 12);
    industrialUser = await prisma.user.create({
      data: {
        email: 'booking-test-industrial@example.com',
        password: industrialPassword,
        firstName: 'Industrial',
        lastName: 'Provider',
        role: 'INDUSTRIAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create industrial KYC
    await prisma.industrialKYC.create({
      data: {
        userId: industrialUser.id,
        companyName: 'Test Booking Services',
        companyEmail: 'booking-test-industrial@example.com',
        companyPhone: '+9771234567890',
        registrationCertificate: 'https://example.com/cert.pdf',
        taxClearanceCertificate: 'https://example.com/tax.pdf',
        panCertificate: 'https://example.com/pan.pdf',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '1',
        status: 'APPROVED',
      },
    });

    // Create individual user (service seeker)
    const individualPassword = await bcrypt.hash('Test1234!@#', 12);
    individualUser = await prisma.user.create({
      data: {
        email: 'booking-test-individual@example.com',
        password: individualPassword,
        firstName: 'Individual',
        lastName: 'Seeker',
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create individual KYC
    await prisma.individualKYC.create({
      data: {
        userId: individualUser.id,
        fullName: 'Individual Seeker',
        gender: 'Male',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        nationalId: '1111111111',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '1',
        email: 'booking-test-individual@example.com',
        phone: '+9771111111111',
        emergencyContact: '+9772222222222',
        highestQualification: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        languagesKnown: ['English', 'Nepali'],
        employmentStatus: 'LOOKING_NEW',
        status: 'APPROVED',
        consentGiven: true,
      },
    });

    // Create category
    category = await prisma.serviceCategory.create({
      data: {
        name: 'Professional Services',
        description: 'Professional and business services',
        isActive: true,
      },
    });

    // Create test service
    testService = await prisma.service.create({
      data: {
        providerId: industrialUser.id,
        title: 'Business Consulting Service',
        description: 'Professional business consulting services',
        detailedDescription: 'Comprehensive business consulting including strategy, operations, and growth planning.',
        specifications: 'Strategy consulting, operational improvement, growth planning',
        standards: 'Industry best practices',
        demographics: 'Small and medium businesses',
        geographics: 'Kathmandu Valley',
        categoryId: category.id,
        priceType: 'HOURLY',
        hourlyRate: 5000,
        negotiable: true,
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        serviceRadius: 15,
        latitude: 27.7172,
        longitude: 85.3240,
        availabilityType: 'FLEXIBLE',
        availableFrom: '09:00',
        availableTo: '17:00',
        workingHours: 'Monday to Friday, 9 AM to 5 PM',
        businessYears: 3,
        teamSize: 5,
        status: 'APPROVED',
        isActive: true,
        customerSatisfactionScore: 4.7,
      },
    });

    // Login both users
    const industrialLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'booking-test-industrial@example.com',
        password: 'Test1234!@#',
      });

    industrialToken = industrialLogin.body.data.tokens.accessToken;

    const individualLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'booking-test-individual@example.com',
        password: 'Test1234!@#',
      });

    individualToken = individualLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.serviceReview.deleteMany();
    await prisma.serviceBooking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.individualKYC.deleteMany();
    await prisma.industrialKYC.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'booking-test@',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/services/bookings', () => {
    it('should create a service booking successfully', async () => {
      const bookingData = {
        serviceId: testService.id,
        scheduledDate: new Date('2025-12-25'),
        scheduledTime: '14:00',
        duration: '2 hours',
        serviceLocation: '123 Test Street, Kathmandu',
        latitude: 27.7172,
        longitude: 85.3240,
        paymentMethod: 'CASH',
        agreedPrice: 10000, // 2 hours * 5000 per hour
        statement: 'Need business strategy consultation for my startup',
        contractualTerms: 'Standard terms apply',
      };

      const response = await request(app)
        .post('/api/services/bookings')
        .set('Authorization', `Bearer ${individualToken}`)
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceId).toBe(testService.id);
      expect(response.body.data.customerId).toBe(individualUser.id);
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.amount).toBe(10000);

      // Store booking for other tests
      testBooking = response.body.data;
    });

    it('should reject booking creation without authentication', async () => {
      const response = await request(app)
        .post('/api/services/bookings')
        .send({
          serviceId: testService.id,
          bookingDate: '2025-12-25',
        });

      expect(response.status).toBe(401);
    });

    it('should reject booking with invalid service ID', async () => {
      const response = await request(app)
        .post('/api/services/bookings')
        .set('Authorization', `Bearer ${individualToken}`)
        .send({
          serviceId: '00000000-0000-0000-0000-000000000000',
          bookingDate: '2025-12-25',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/services/bookings/customer', () => {
    it('should get customer bookings', async () => {
      const response = await request(app)
        .get('/api/services/bookings/customer')
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify booking data
      const booking = response.body.data[0];
      expect(booking.serviceId).toBe(testService.id);
      expect(booking.customerId).toBe(individualUser.id);
      expect(booking.status).toBe('PENDING');
    });
  });

  describe('GET /api/services/bookings/provider', () => {
    it('should get provider bookings', async () => {
      const response = await request(app)
        .get('/api/services/bookings/provider')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/services/bookings/:id', () => {
    it('should get booking by ID', async () => {
      const response = await request(app)
        .get(`/api/services/bookings/${testBooking.id}`)
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testBooking.id);
      expect(response.body.data.serviceId).toBe(testService.id);
      expect(response.body.data.customerId).toBe(individualUser.id);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .get('/api/services/bookings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/services/bookings/:id/status', () => {
    it('should update booking status by provider', async () => {
      const response = await request(app)
        .patch(`/api/services/bookings/${testBooking.id}/status`)
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          status: 'CONFIRMED',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('should update booking to in progress', async () => {
      const response = await request(app)
        .patch(`/api/services/bookings/${testBooking.id}/status`)
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          status: 'IN_PROGRESS',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('IN_PROGRESS');
    });

    it('should complete booking', async () => {
      const response = await request(app)
        .patch(`/api/services/bookings/${testBooking.id}/status`)
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('COMPLETED');
    });

    it('should reject status update by non-provider', async () => {
      const response = await request(app)
        .patch(`/api/services/bookings/${testBooking.id}/status`)
        .set('Authorization', `Bearer ${individualToken}`)
        .send({
          status: 'CANCELLED',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/services/bookings/:id/cancel', () => {
    it('should cancel booking by customer', async () => {
      // Create another booking for cancellation test
      const newBookingResponse = await request(app)
        .post('/api/services/bookings')
        .set('Authorization', `Bearer ${individualToken}`)
        .send({
          serviceId: testService.id,
          scheduledDate: '2025-12-26',
          scheduledTime: '10:00',
          duration: '1 hour',
          serviceLocation: '456 Test Avenue, Kathmandu',
          latitude: 27.7172,
          longitude: 85.3240,
          paymentMethod: 'CASH',
          agreedPrice: 5000,
          statement: 'Quick consultation needed',
        });

      const newBooking = newBookingResponse.body.data;

      const cancelResponse = await request(app)
        .post(`/api/services/bookings/${newBooking.id}/cancel`)
        .set('Authorization', `Bearer ${individualToken}`)
        .send({
          reason: 'Schedule conflict',
        });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);

      // Verify booking is cancelled
      const checkResponse = await request(app)
        .get(`/api/services/bookings/${newBooking.id}`)
        .set('Authorization', `Bearer ${individualToken}`);

      expect(checkResponse.body.data.status).toBe('CANCELLED');
    });
  });
});
