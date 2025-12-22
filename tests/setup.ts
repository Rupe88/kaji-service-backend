import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Jest setup hooks - declare globals
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;

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

