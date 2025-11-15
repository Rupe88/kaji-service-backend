import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

describe('Job Posting E2E Tests', () => {
  let employerUser: any;
  let employerToken: string;
  let jobPosting: any;

  beforeAll(async () => {
    // Create test employer user
    const hashedPassword = await bcrypt.hash('Test1234!@#', 12);
    employerUser = await prisma.user.create({
      data: {
        email: 'employer@test.com',
        password: hashedPassword,
        role: 'INDUSTRIAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create industrial KYC
    await prisma.industrialKYC.create({
      data: {
        userId: employerUser.id,
        companyName: 'Test Company',
        companyEmail: 'employer@test.com',
        companyPhone: '+9771234567890',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '1',
        registrationCertificate: 'https://example.com/cert.pdf',
        taxClearanceCertificate: 'https://example.com/tax.pdf',
        panCertificate: 'https://example.com/pan.pdf',
        status: 'APPROVED',
      },
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employer@test.com',
        password: 'Test1234!@#',
      });

    employerToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up
    if (jobPosting) {
      await prisma.jobApplication.deleteMany({ where: { jobId: jobPosting.id } });
      await prisma.jobPosting.delete({ where: { id: jobPosting.id } });
    }
    await prisma.industrialKYC.deleteMany({ where: { userId: employerUser.id } });
    await prisma.user.delete({ where: { id: employerUser.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/jobs', () => {
    it('should create a job posting', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          employerId: employerUser.id,
          title: 'Software Developer',
          description: 'We are looking for a skilled software developer',
          requirements: '5+ years of experience in Node.js and TypeScript',
          responsibilities: 'Develop and maintain backend services',
          jobType: 'FULL_TIME_2YEAR',
          country: 'Nepal',
          province: 'Bagmati',
          district: 'Kathmandu',
          city: 'Kathmandu',
          isRemote: false,
          salaryMin: 50000,
          salaryMax: 100000,
          salaryType: 'MONTHLY',
          requiredSkills: {
            'Node.js': 4,
            'TypeScript': 4,
            'PostgreSQL': 3,
          },
          experienceYears: 5,
          totalPositions: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Software Developer');
      jobPosting = response.body.data;
    });

    it('should reject job posting with invalid data', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          employerId: employerUser.id,
          title: '', // Invalid: empty title
          description: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject job posting if salary max < min', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          employerId: employerUser.id,
          title: 'Test Job',
          description: 'Test description',
          requirements: 'Test requirements',
          jobType: 'FULL_TIME_1YEAR',
          country: 'Nepal',
          province: 'Bagmati',
          district: 'Kathmandu',
          city: 'Kathmandu',
          salaryMin: 100000,
          salaryMax: 50000, // Invalid: max < min
          requiredSkills: { 'JavaScript': 3 },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/jobs', () => {
    it('should get all job postings with filters', async () => {
      const response = await request(app)
        .get('/api/jobs?province=Bagmati&jobType=FULL_TIME_2YEAR&page=1&limit=10')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should search job postings by keyword', async () => {
      const response = await request(app)
        .get('/api/jobs?search=Software')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should get a specific job posting', async () => {
      if (!jobPosting) return;

      const response = await request(app)
        .get(`/api/jobs/${jobPosting.id}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(jobPosting.id);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('should update a job posting', async () => {
      if (!jobPosting) return;

      const response = await request(app)
        .put(`/api/jobs/${jobPosting.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Senior Software Developer',
          salaryMax: 120000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Senior Software Developer');
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should deactivate a job posting', async () => {
      if (!jobPosting) return;

      const response = await request(app)
        .delete(`/api/jobs/${jobPosting.id}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deactivated
      const updated = await prisma.jobPosting.findUnique({
        where: { id: jobPosting.id },
      });
      expect(updated?.isActive).toBe(false);
    });
  });
});

