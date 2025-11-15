import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean up test database if needed
  // await prisma.$executeRaw`TRUNCATE TABLE users CASCADE;`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Clean up after each test if needed
  // await prisma.user.deleteMany();
});

