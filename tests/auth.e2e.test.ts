import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';

describe('Authentication E2E Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.oTP.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test@',
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up
    if (testUser) {
      await prisma.oTP.deleteMany({ where: { userId: testUser.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234!@#',
          firstName: 'Test',
          lastName: 'User',
          role: 'INDIVIDUAL',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.role).toBe('INDIVIDUAL');

      // Store user for cleanup
      testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak',
          role: 'INDIVIDUAL',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test1234!@#',
          role: 'INDIVIDUAL',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234!@#',
          role: 'INDIVIDUAL',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP and activate account', async () => {
      if (!testUser) {
        testUser = await prisma.user.findUnique({
          where: { email: 'test@example.com' },
        });
      }

      // Get the OTP from database
      const otpRecord = await prisma.oTP.findFirst({
        where: {
          userId: testUser.id,
          type: 'EMAIL_VERIFICATION',
          isUsed: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (otpRecord) {
        const response = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            email: 'test@example.com',
            code: otpRecord.code,
            type: 'EMAIL_VERIFICATION',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.isEmailVerified).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();

        // Tokens are stored in cookies, not in response.cookies
        // Access token is in response body, refresh token is in cookie
      }
    });

    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          code: '000000',
          type: 'EMAIL_VERIFICATION',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234!@#',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      // Check cookies in headers
      expect(response.headers['set-cookie']).toBeDefined();
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [];
      expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should lock account after max failed attempts', async () => {
      // Try to login with wrong password multiple times
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123!',
          });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(423);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234!@#',
        });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = Array.isArray(setCookieHeader)
        ? setCookieHeader.find((cookie: string) => cookie.startsWith('refreshToken='))?.split(';')[0]?.split('=')[1]
        : undefined;

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshTokenCookie}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234!@#',
        });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const accessTokenCookie = Array.isArray(setCookieHeader)
        ? setCookieHeader.find((cookie: string) => cookie.startsWith('accessToken='))?.split(';')[0]?.split('=')[1]
        : undefined;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`accessToken=${accessTokenCookie}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke refresh token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234!@#',
        });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [];
      const cookieString = cookies.join('; ');

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookieString);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

