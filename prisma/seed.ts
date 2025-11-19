import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create employer user
  const employerEmail = 'employer@example.com';
  const employerPassword = 'Employer123!';

  // Check if employer already exists
  const existingEmployer = await prisma.user.findUnique({
    where: { email: employerEmail },
  });

  if (existingEmployer) {
    console.log('✅ Employer user already exists, skipping...');
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(employerPassword, 12);

  // Create employer user
  const employer = await prisma.user.create({
    data: {
      email: employerEmail,
      password: hashedPassword,
      firstName: 'Tech',
      lastName: 'Corp',
      phone: '+977-9800000000',
      role: 'INDUSTRIAL',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });

  console.log('✅ Created employer user:', employer.email);

  // Create Industrial KYC with APPROVED status
  const industrialKYC = await prisma.industrialKYC.create({
    data: {
      userId: employer.id,
      companyName: 'Tech Solutions Nepal',
      companyEmail: employerEmail,
      companyPhone: '+977-9800000000',
      registrationNumber: 'REG-123456',
      yearsInBusiness: 5,
      companySize: '50-100',
      industrySector: 'Information Technology',
      
      // Documents (using placeholder URLs - in production these would be actual uploaded files)
      registrationCertificate: 'https://example.com/certificates/registration.pdf',
      taxClearanceCertificate: 'https://example.com/certificates/tax.pdf',
      panCertificate: 'https://example.com/certificates/pan.pdf',
      vatCertificate: 'https://example.com/certificates/vat.pdf',
      
      // Address
      country: 'Nepal',
      province: '3', // Bagmati
      district: 'Kathmandu',
      municipality: 'Kathmandu Metropolitan City',
      ward: '1',
      street: 'Durbar Marg',
      
      // Contact Person
      contactPersonName: 'John Doe',
      contactPersonDesignation: 'HR Manager',
      contactPersonPhone: '+977-9800000001',
      
      // KYC Status - APPROVED so they can post jobs
      status: 'APPROVED',
      verifiedAt: new Date(),
      verifiedBy: 'system',
    },
  });

  console.log('✅ Created Industrial KYC with APPROVED status');
  console.log('✅ Company:', industrialKYC.companyName);

  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:', employerEmail);
  console.log('Password:', employerPassword);
  console.log('Role: INDUSTRIAL');
  console.log('KYC Status: APPROVED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

