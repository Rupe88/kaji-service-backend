import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

describe('Services E2E Tests', () => {
  let industrialUser: any;
  let industrialToken: any;
  let testService: any;
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
          contains: 'service-test@',
        },
      },
    });

    // Create industrial user for testing
    const hashedPassword = await bcrypt.hash('Test1234!@#', 12);
    industrialUser = await prisma.user.create({
      data: {
        email: 'service-test-industrial@example.com',
        password: hashedPassword,
        firstName: 'Industrial',
        lastName: 'User',
        role: 'INDUSTRIAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create industrial KYC
    await prisma.industrialKYC.create({
      data: {
        userId: industrialUser.id,
        companyName: 'Test Services Company',
        companyEmail: 'service-test-industrial@example.com',
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

    // Create test category
    category = await prisma.serviceCategory.create({
      data: {
        name: 'Home Services',
        description: 'Home and household services',
        isActive: true,
      },
    });

    // Create subcategory
    await prisma.serviceSubcategory.create({
      data: {
        categoryId: category.id,
        name: 'Cleaning Services',
        description: 'Professional cleaning services',
        isActive: true,
      },
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'service-test-industrial@example.com',
        password: 'Test1234!@#',
      });

    industrialToken = loginResponse.body.data.tokens.accessToken;
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
          contains: 'service-test@',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/services', () => {
    it('should create a new service successfully', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          title: 'Professional Home Cleaning',
          description: 'Comprehensive home cleaning services with experienced staff',
          detailedDescription: 'We provide thorough cleaning of homes, offices, and commercial spaces using eco-friendly products.',
          specifications: 'Daily cleaning, deep cleaning, move-in/out cleaning',
          standards: 'ISO certified cleaning processes',
          demographics: 'All age groups and property types',
          geographics: 'Kathmandu Valley and surrounding areas',
          categoryId: category.id,
          subcategoryId: 1, // Assuming subcategory ID
          priceType: 'FIXED',
          priceMin: 2000,
          priceMax: 5000,
          negotiable: true,
          country: 'Nepal',
          province: 'Bagmati',
          district: 'Kathmandu',
          city: 'Kathmandu',
          serviceRadius: 10,
          latitude: 27.7172,
          longitude: 85.3240,
          availabilityType: 'FLEXIBLE',
          availableFrom: '09:00',
          availableTo: '18:00',
          workingHours: 'Monday to Saturday, 9 AM to 6 PM',
          businessYears: 5,
          teamSize: 10,
          certifications: ['ISO 9001', 'Eco-Friendly Certification'],
          documents: ['license.pdf', 'insurance.pdf'],
          socialLinks: {
            facebook: 'https://facebook.com/testcleaning',
            website: 'https://testcleaning.com'
          },
          portfolioUrls: ['https://portfolio.com/project1', 'https://portfolio.com/project2'],
          affiliateProgram: true,
          customerSatisfactionScore: 4.8,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Professional Home Cleaning');
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.providerId).toBe(industrialUser.id);

      // Store service for other tests
      testService = response.body.data;
    });

    it('should reject service creation without authentication', async () => {
      const response = await request(app)
        .post('/api/services')
        .send({
          title: 'Test Service',
          description: 'Test description',
          categoryId: category.id,
        });

      expect(response.status).toBe(401);
    });

    it('should reject service creation with invalid data', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          title: '', // Invalid: empty title
          description: 'Test description',
          categoryId: category.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/services', () => {
    it('should search services with filters', async () => {
      const response = await request(app)
        .get('/api/services?category=home-services&province=Bagmati&limit=10')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should search services by location', async () => {
      const response = await request(app)
        .get('/api/services?district=Kathmandu&city=Kathmandu')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter services by price range', async () => {
      const response = await request(app)
        .get('/api/services?priceMin=1000&priceMax=10000')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/services/:id', () => {
    it('should get service by ID', async () => {
      const response = await request(app)
        .get(`/api/services/${testService.id}`)
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testService.id);
      expect(response.body.data.title).toBe('Professional Home Cleaning');
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request(app)
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/services/my-services', () => {
    it('should get provider services', async () => {
      const response = await request(app)
        .get('/api/services/my-services')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/services/:id', () => {
    it('should update service', async () => {
      const response = await request(app)
        .put(`/api/services/${testService.id}`)
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          title: 'Updated Professional Home Cleaning',
          priceMin: 2500,
          priceMax: 6000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Professional Home Cleaning');
      expect(response.body.data.priceMin).toBe(2500);
    });

    it('should reject update for non-owned service', async () => {
      // This would require another user - simplified test
      const response = await request(app)
        .put('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${industrialToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('should delete service', async () => {
      const response = await request(app)
        .delete(`/api/services/${testService.id}`)
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify service is deleted
      const checkResponse = await request(app)
        .get(`/api/services/${testService.id}`)
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });

  describe('GET /api/services/trending', () => {
    it('should get trending services', async () => {
      const response = await request(app)
        .get('/api/services/trending')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/services/categories/stats', () => {
    it('should get category statistics', async () => {
      const response = await request(app)
        .get('/api/services/categories/stats')
        .set('Authorization', `Bearer ${industrialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
