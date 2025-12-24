import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';
import { BookingStatus } from '@prisma/client';

describe('Reviews E2E Tests', () => {
  let industrialUser: any;
  let industrialToken: any;
  let individualUser: any;
  let individualToken: any;
  let testService: any;
  let testBooking: any;
  let testReview: any;
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
          contains: 'review-test@',
        },
      },
    });

    // Create industrial user (service provider)
    const industrialPassword = await bcrypt.hash('Test1234!@#', 12);
    industrialUser = await prisma.user.create({
      data: {
        email: 'review-test-industrial@example.com',
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
        companyName: 'Test Review Services',
        companyEmail: 'review-test-industrial@example.com',
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
        email: 'review-test-individual@example.com',
        password: individualPassword,
        firstName: 'Individual',
        lastName: 'Reviewer',
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create individual KYC
    await prisma.individualKYC.create({
      data: {
        userId: individualUser.id,
        fullName: 'Individual Reviewer',
        gender: 'Female',
        dateOfBirth: '1985-05-15T00:00:00.000Z',
        nationalId: '2222222222',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '1',
        email: 'review-test-individual@example.com',
        phone: '+9772222222222',
        emergencyContact: '+9773333333333',
        highestQualification: 'Master',
        fieldOfStudy: 'Business Administration',
        languagesKnown: ['English', 'Nepali', 'Hindi'],
        employmentStatus: 'FULLY_EMPLOYED',
        status: 'APPROVED',
        consentGiven: true,
      },
    });

    // Create category
    category = await prisma.serviceCategory.create({
      data: {
        name: 'Technology Services',
        description: 'IT and technology related services',
        isActive: true,
      },
    });

    // Create test service
    testService = await prisma.service.create({
      data: {
        providerId: industrialUser.id,
        title: 'Web Development Service',
        description: 'Professional web development and design services',
        detailedDescription: 'Full-stack web development including frontend, backend, and deployment. Specializing in modern frameworks and responsive design.',
        specifications: 'React, Node.js, PostgreSQL, Cloud deployment',
        standards: 'Industry best practices, WCAG accessibility',
        demographics: 'Startups, small businesses, enterprises',
        geographics: 'Kathmandu Valley and remote clients',
        categoryId: category.id,
        priceType: 'PROJECT_BASED',
        projectBased: true,
        priceMin: 150000,
        negotiable: true,
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        serviceRadius: 50, // Remote work
        latitude: 27.7172,
        longitude: 85.3240,
        availabilityType: 'FLEXIBLE',
        workingHours: 'Flexible hours, project-based timeline',
        businessYears: 4,
        teamSize: 8,
        certifications: ['AWS Certified', 'Google Analytics Certified'],
        documents: ['portfolio.pdf', 'certifications.pdf'],
        socialLinks: {
          linkedin: 'https://linkedin.com/company/testdev',
          github: 'https://github.com/testdev',
          website: 'https://testdev.com'
        },
        portfolioUrls: [
          'https://testdev.com/project1',
          'https://testdev.com/project2',
          'https://testdev.com/project3'
        ],
        affiliateProgram: false,
        status: 'APPROVED',
        isActive: true,
        customerSatisfactionScore: 4.9,
      },
    });

    // Create completed booking for review testing
    testBooking = await prisma.serviceBooking.create({
      data: {
        serviceId: testService.id,
        customerId: individualUser.id,
        bookingDate: new Date(),
        scheduledDate: new Date('2025-12-20'),
        scheduledTime: '10:00',
        duration: '40 hours',
        serviceLocation: 'Remote Project',
        latitude: 27.7172,
        longitude: 85.3240,
        paymentMethod: 'ONLINE_BANKING',
        agreedPrice: 150000,
        statement: 'Need complete e-commerce website development',
        contractualTerms: 'Standard development contract terms apply',
        status: BookingStatus.COMPLETED,
        startedAt: new Date('2025-12-20T10:00:00.000Z'),
        completedAt: new Date('2025-12-21T14:00:00.000Z'),
      },
    });

    // Login both users
    const industrialLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'review-test-industrial@example.com',
        password: 'Test1234!@#',
      });

    industrialToken = industrialLogin.body.data.tokens.accessToken;

    const individualLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'review-test-individual@example.com',
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
          contains: 'review-test@',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/reviews', () => {
    it('should create a review for completed booking', async () => {
      const reviewData = {
        bookingId: testBooking.id,
        rating: 5,
        review: 'Excellent service! The web development team delivered exactly what was promised. Professional, timely, and high-quality work. Highly recommend!',
        qualityRating: 5,
        timelinessRating: 5,
        communicationRating: 5,
        valueRating: 5,
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${individualToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bookingId).toBe(testBooking.id);
      expect(response.body.data.customerId).toBe(individualUser.id);
      expect(response.body.data.serviceId).toBe(testService.id);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.qualityRating).toBe(5);

      // Store review for other tests
      testReview = response.body.data;
    });

    it('should reject review creation without authentication', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: testBooking.id,
          rating: 4,
        });

      expect(response.status).toBe(401);
    });

    it('should reject review for non-completed booking', async () => {
      // Create a pending booking
      const pendingBooking = await prisma.serviceBooking.create({
        data: {
          serviceId: testService.id,
          customerId: individualUser.id,
          bookingDate: new Date(),
          scheduledDate: new Date('2025-12-25'),
          scheduledTime: '10:00',
          duration: '1 hour',
          serviceLocation: 'Test Location',
          latitude: 27.7172,
          longitude: 85.3240,
          paymentMethod: 'CASH',
          agreedPrice: 5000,
          status: BookingStatus.PENDING, // Not completed
        },
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${individualToken}`)
        .send({
          bookingId: pendingBooking.id,
          rating: 4,
          review: 'Test review',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('completed');

      // Clean up
      await prisma.serviceBooking.delete({ where: { id: pendingBooking.id } });
    });
  });

  describe('GET /api/reviews', () => {
    it('should get reviews with filters', async () => {
      const response = await request(app)
        .get('/api/reviews?serviceId=' + testService.id + '&limit=10')
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify review data
      const review = response.body.data[0];
      expect(review.serviceId).toBe(testService.id);
      expect(review.customerId).toBe(individualUser.id);
      expect(review.rating).toBe(5);
    });

    it('should filter reviews by rating', async () => {
      const response = await request(app)
        .get('/api/reviews?rating=5&limit=10')
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should paginate reviews', async () => {
      const response = await request(app)
        .get('/api/reviews?page=1&limit=5')
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should get review by ID', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReview.id);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.review).toBe('Excellent service! The web development team delivered exactly what was promised. Professional, timely, and high-quality work. Highly recommend!');
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .get('/api/reviews/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should update own review', async () => {
      const updateData = {
        rating: 4,
        review: 'Updated review: Great service with minor improvements needed.',
        qualityRating: 5,
        timelinessRating: 4,
        communicationRating: 5,
        valueRating: 4,
      };

      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${individualToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(4);
      expect(response.body.data.timelinessRating).toBe(4);
    });

    it('should reject update of another user review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          rating: 3,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should delete own review', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify review is deleted
      const checkResponse = await request(app)
        .get(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${individualToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });

  describe('POST /api/reviews/:id/respond', () => {
    beforeAll(async () => {
      // Recreate the review for response testing
      testReview = await prisma.serviceReview.create({
        data: {
          bookingId: testBooking.id,
          customerId: individualUser.id,
          serviceId: testService.id,
          rating: 4,
          review: 'Good service, would recommend with some improvements.',
          qualityRating: 4,
          timelinessRating: 4,
          communicationRating: 5,
          valueRating: 4,
        },
      });
    });

    it('should allow provider to respond to review', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/respond`)
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          response: 'Thank you for the feedback! We appreciate your business and will work on the improvements you suggested.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providerResponse).toBe('Thank you for the feedback! We appreciate your business and will work on the improvements you suggested.');
    });

    it('should reject response from non-provider', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/respond`)
        .set('Authorization', `Bearer ${individualToken}`)
        .send({
          response: 'This should not work',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews/service/:serviceId/stats', () => {
    it('should get service review statistics', async () => {
      const response = await request(app)
        .get(`/api/reviews/service/${testService.id}/stats`)
        .set('Authorization', `Bearer ${individualToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('averageRating');
      expect(response.body.data).toHaveProperty('totalReviews');
      expect(response.body.data).toHaveProperty('ratingDistribution');
      expect(response.body.data.averageRating).toBeGreaterThan(0);
      expect(response.body.data.totalReviews).toBeGreaterThan(0);
    });
  });
});
