import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

describe('Skill Matching E2E Tests', () => {
  let jobPosting: any;
  let candidate1: any;
  let candidate2: any;
  let employerUser: any;
  let candidate1User: any;
  let candidate2User: any;

  beforeAll(async () => {
    // Create employer
    const hashedPassword = await bcrypt.hash('Test1234!@#', 12);
    employerUser = await prisma.user.create({
      data: {
        email: 'employer@matching.com',
        password: hashedPassword,
        role: 'INDUSTRIAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    await prisma.industrialKYC.create({
      data: {
        userId: employerUser.id,
        companyName: 'Tech Corp',
        companyEmail: 'employer@matching.com',
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

    // Create job posting
    jobPosting = await prisma.jobPosting.create({
      data: {
        employerId: employerUser.id,
        title: 'Full Stack Developer',
        description: 'Looking for a full stack developer',
        requirements: 'Must know React, Node.js, and PostgreSQL',
        jobType: 'FULL_TIME_2YEAR',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        isRemote: false,
        requiredSkills: {
          'React': 4,
          'Node.js': 4,
          'PostgreSQL': 3,
        },
        experienceYears: 3,
        isVerified: true,
      },
    });

    // Create candidate 1 (good match)
    candidate1User = await prisma.user.create({
      data: {
        email: 'candidate1@matching.com',
        password: hashedPassword,
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    candidate1 = await prisma.individualKYC.create({
      data: {
        userId: candidate1User.id,
        fullName: 'Perfect Match',
        gender: 'Male',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        nationalId: '1111111111',
        country: 'Nepal',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu',
        ward: '1',
        email: 'candidate1@matching.com',
        phone: '+9771111111111',
        highestQualification: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        languagesKnown: ['English', 'Nepali'],
        employmentStatus: 'LOOKING_NEW',
        technicalSkills: {
          'React': 5,
          'Node.js': 5,
          'PostgreSQL': 4,
          'TypeScript': 4,
        },
        experience: [
          {
            company: 'Tech Company',
            position: 'Developer',
            years: 4,
          },
        ],
        status: 'APPROVED',
        consentGiven: true,
      },
    });

    // Create candidate 2 (poor match)
    candidate2User = await prisma.user.create({
      data: {
        email: 'candidate2@matching.com',
        password: hashedPassword,
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    candidate2 = await prisma.individualKYC.create({
      data: {
        userId: candidate2User.id,
        fullName: 'Poor Match',
        gender: 'Female',
        dateOfBirth: '1995-01-01T00:00:00.000Z',
        nationalId: '2222222222',
        country: 'Nepal',
        province: 'Gandaki', // Different location
        district: 'Pokhara',
        municipality: 'Pokhara',
        ward: '1',
        email: 'candidate2@matching.com',
        phone: '+9772222222222',
        highestQualification: 'High School',
        fieldOfStudy: 'General',
        languagesKnown: ['Nepali'],
        employmentStatus: 'LOOKING_NEW',
        technicalSkills: {
          'Python': 3,
          'Java': 2,
        },
        experience: [
          {
            company: 'Other Company',
            position: 'Intern',
            years: 1,
          },
        ],
        status: 'APPROVED',
        consentGiven: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.individualKYC.deleteMany({
      where: {
        userId: { in: [candidate1User.id, candidate2User.id] },
      },
    });
    await prisma.jobPosting.delete({ where: { id: jobPosting.id } });
    await prisma.industrialKYC.delete({ where: { userId: employerUser.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [employerUser.id, candidate1User.id, candidate2User.id] },
      },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/skill-matching/job/:jobId', () => {
    it('should match users to a job posting', async () => {
      const response = await request(app)
        .get(`/api/skill-matching/job/${jobPosting.id}?limit=10`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Candidate 1 should have higher match score
      if (response.body.data.length >= 2) {
        const match1 = response.body.data.find((m: any) => m.userId === candidate1User.id);
        const match2 = response.body.data.find((m: any) => m.userId === candidate2User.id);
        
        if (match1 && match2) {
          expect(match1.matchScore).toBeGreaterThan(match2.matchScore);
        }
      }
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/skill-matching/job/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/skill-matching/user/:userId', () => {
    it('should match jobs to a user', async () => {
      const response = await request(app)
        .get(`/api/skill-matching/user/${candidate1User.id}?limit=10`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/skill-matching/search', () => {
    it('should search users by skills', async () => {
      const response = await request(app)
        .get('/api/skill-matching/search?skills=React,Node.js&location=Bagmati,Kathmandu');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should require skills parameter', async () => {
      const response = await request(app)
        .get('/api/skill-matching/search');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

