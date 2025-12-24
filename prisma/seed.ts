import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedServiceCategories } from './seed/serviceCategories';

const prisma = new PrismaClient();

// Nepal location coordinates (Kathmandu, Pokhara, etc.)
const LOCATIONS = {
  kathmandu: {
    lat: 27.7172,
    lng: 85.324,
    province: 'Bagmati',
    district: 'Kathmandu',
    city: 'Kathmandu',
  },
  pokhara: {
    lat: 28.2096,
    lng: 83.9856,
    province: 'Gandaki',
    district: 'Kaski',
    city: 'Pokhara',
  },
  lalitpur: {
    lat: 27.6667,
    lng: 85.3167,
    province: 'Bagmati',
    district: 'Lalitpur',
    city: 'Lalitpur',
  },
  bhaktapur: {
    lat: 27.671,
    lng: 85.4298,
    province: 'Bagmati',
    district: 'Bhaktapur',
    city: 'Bhaktapur',
  },
  itahari: {
    lat: 26.6646,
    lng: 87.2718,
    province: 'Koshi', // Province 1
    district: 'Sunsari',
    city: 'Itahari',
  },
};

async function main() {
  console.log('🌱 Starting Kaji Service Marketplace seed...\n');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing seed data...');

  // Helper function to safely delete from tables that may not exist
  const safeDelete = async (
    operation: () => Promise<any>,
    tableName: string
  ) => {
    try {
      await operation();
      console.log(`✅ Cleared ${tableName}`);
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log(`⏭️  Table ${tableName} does not exist, skipping...`);
      } else {
        throw error;
      }
    }
  };

  // Clear service marketplace data
  await safeDelete(() => prisma.serviceReview.deleteMany({}), 'service_reviews');
  await safeDelete(() => prisma.serviceBooking.deleteMany({}), 'service_bookings');
  await safeDelete(() => prisma.service.deleteMany({}), 'services');
  await safeDelete(() => prisma.serviceCategory.deleteMany({}), 'service_categories');
  await safeDelete(() => prisma.individualKYC.deleteMany({}), 'individual_kyc');
  await safeDelete(() => prisma.industrialKYC.deleteMany({}), 'industrial_kyc');

  try {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            // Service Providers
            'provider1@kaji.com',
            'provider2@kaji.com',
            'provider3@kaji.com',
            'provider4@kaji.com',
            'provider5@kaji.com',
            // Customers
            'customer1@kaji.com',
            'customer2@kaji.com',
            'customer3@kaji.com',
            'customer4@kaji.com',
            'customer5@kaji.com',
            // Admins
            'admin@kaji.com',
            'moderator@kaji.com',
          ],
        },
      },
    });
    console.log('✅ Cleared seed users');
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⏭️  Users table does not exist, skipping...');
    } else {
      throw error;
    }
  }
  console.log('✅ Cleaned existing data\n');

  const hashedPassword = await bcrypt.hash('Password123!', 12);

  // ============================================
  // STEP 1: CREATE SERVICE CATEGORIES (TEST DATA ONLY)
  // ============================================
  console.log('📋 STEP 1: Creating Service Categories...\n');

  const testCategories = [
    {
      id: 'home-services',
      name: 'Home Services',
      description: 'Professional home maintenance and repair services',
    },
    {
      id: 'it-digital',
      name: 'IT & Digital Services',
      description: 'Technology and digital solutions',
    },
    {
      id: 'business-consulting',
      name: 'Business Consulting',
      description: 'Professional business advisory services',
    },
    {
      id: 'creative-media',
      name: 'Creative & Media',
      description: 'Creative and media production services',
    },
    {
      id: 'education-tutoring',
      name: 'Education & Tutoring',
      description: 'Educational and tutoring services',
    },
  ];

  const createdCategories: any[] = [];

  for (const cat of testCategories) {
    // Create category first
    const category = await prisma.serviceCategory.create({
      data: {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
    });

    // Create 2 basic subcategories for each category
    const subcategories = [
      `${cat.name.split(' ')[0]} Service 1`,
      `${cat.name.split(' ')[0]} Service 2`,
    ];

    const createdSubcategories: any[] = [];
    for (const subName of subcategories) {
      const subcategory = await prisma.serviceSubcategory.create({
        data: {
          categoryId: category.id,
          name: subName,
          isActive: true,
        },
      });
      createdSubcategories.push(subcategory);
    }

    createdCategories.push({ ...category, subcategories: createdSubcategories });
    console.log(`✅ Created category: ${cat.name} with ${createdSubcategories.length} subcategories`);
  }

  console.log(`\n✅ Created ${createdCategories.length} test service categories\n`);

  // ============================================
  // STEP 2: CREATE SERVICE PROVIDERS
  // ============================================
  console.log('📋 STEP 2: Creating Service Providers with Industrial KYC...\n');

  const providers = [
    {
      email: 'provider1@kaji.com',
      firstName: 'Raj',
      lastName: 'Tech',
      phone: '+977-9800000001',
      companyName: 'Raj Tech Solutions',
      industrySector: 'Information Technology',
      categoryId: '38e65bd1-4161-47ee-8922-2543da4b0aa4',
      location: LOCATIONS.kathmandu,
      services: [
        {
          title: 'Website Development',
          description: 'Professional website development using modern technologies',
          subcategory: 'Web Design',
          price: 50000,
          priceType: 'FIXED' as const,
        },
        {
          title: 'Mobile App Development',
          description: 'Cross-platform mobile app development',
          subcategory: 'App Development',
          price: 1500,
          priceType: 'HOURLY' as const,
        },
      ],
    },
    {
      email: 'provider2@kaji.com',
      firstName: 'Maya',
      lastName: 'Home',
      phone: '+977-9800000002',
      companyName: 'Maya Home Services',
      industrySector: 'Home Services',
      categoryId: '19cebff5-98ac-443c-8709-0ba9af562477',
      location: LOCATIONS.lalitpur,
      services: [
        {
          title: 'House Cleaning Service',
          description: 'Professional deep cleaning for homes and offices',
          subcategory: 'House Cleaning',
          price: 3000,
          priceType: 'FIXED' as const,
        },
        {
          title: 'Plumbing Services',
          description: 'Expert plumbing repair and installation',
          subcategory: 'Plumbing',
          price: 2000,
          priceType: 'FIXED' as const,
        },
      ],
    },
    {
      email: 'provider3@kaji.com',
      firstName: 'Business',
      lastName: 'Consult',
      phone: '+977-9800000003',
      companyName: 'Business Consulting Nepal',
      industrySector: 'Consulting',
      categoryId: '186979c7-8a4f-4796-911b-75dac15b3ea4',
      location: LOCATIONS.pokhara,
      services: [
        {
          title: 'Legal Consultation',
          description: 'Professional legal advice and documentation',
          subcategory: 'Legal Consulting',
          price: 5000,
          priceType: 'FIXED' as const,
        },
        {
          title: 'Business Strategy',
          description: 'Strategic business planning and growth consulting',
          subcategory: 'Business Coaching',
          price: 8000,
          priceType: 'FIXED' as const,
        },
      ],
    },
    {
      email: 'provider4@kaji.com',
      firstName: 'Creative',
      lastName: 'Studio',
      phone: '+977-9800000004',
      companyName: 'Creative Studio Nepal',
      industrySector: 'Creative Services',
      categoryId: 'creative-media',
      location: LOCATIONS.bhaktapur,
      services: [
        {
          title: 'Photography Services',
          description: 'Professional photography for events and portraits',
          subcategory: 'Photography',
          price: 15000,
          priceType: 'FIXED' as const,
        },
        {
          title: 'Graphic Design',
          description: 'Logo design, branding, and marketing materials',
          subcategory: 'Graphic Design',
          price: 2500,
          priceType: 'FIXED' as const,
        },
      ],
    },
    {
      email: 'provider5@kaji.com',
      firstName: 'Edu',
      lastName: 'Nepal',
      phone: '+977-9800000005',
      companyName: 'Edu Nepal Institute',
      industrySector: 'Education',
      categoryId: 'education-tutoring',
      location: LOCATIONS.itahari,
      services: [
        {
          title: 'Math Tutoring',
          description: 'Personalized math tutoring for all levels',
          subcategory: 'Tutoring',
          price: 800,
          priceType: 'HOURLY' as const,
        },
        {
          title: 'English Language Classes',
          description: 'English language learning and conversation',
          subcategory: 'Language Learning',
          price: 1200,
          priceType: 'HOURLY' as const,
        },
      ],
    },
  ];

  const createdProviders: Array<{ user: any; kyc: any; services: any[] }> = [];

  for (const prov of providers) {
    // Create user
    const user = await prisma.user.create({
      data: {
        email: prov.email,
        password: hashedPassword,
        firstName: prov.firstName,
        lastName: prov.lastName,
        phone: prov.phone,
        role: 'INDUSTRIAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create industrial KYC
    const kyc = await prisma.industrialKYC.create({
      data: {
        userId: user.id,
        companyName: prov.companyName,
        companyEmail: prov.email,
        companyPhone: prov.phone,
        registrationNumber: `REG-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`,
        yearsInBusiness: Math.floor(Math.random() * 8) + 2,
        companySize: ['1-10', '10-50', '50-100'][Math.floor(Math.random() * 3)],
        industrySector: prov.industrySector,
        registrationCertificate: 'https://example.com/certificates/registration.pdf',
        taxClearanceCertificate: 'https://example.com/certificates/tax.pdf',
        panCertificate: 'https://example.com/certificates/pan.pdf',
        vatCertificate: 'https://example.com/certificates/vat.pdf',
        country: 'Nepal',
        province: prov.location.province,
        district: prov.location.district,
        municipality: `${prov.location.city} Metropolitan City`,
        ward: String(Math.floor(Math.random() * 35) + 1),
        street: 'Main Street',
        contactPersonName: `${prov.firstName} ${prov.lastName}`,
        contactPersonDesignation: 'Service Provider',
        contactPersonPhone: prov.phone,
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: 'system',
      },
    });

    // Create 2 test services for this provider
    const createdServices: any[] = [];
    const category = createdCategories.find(c => c.id === prov.categoryId);
    if (category && category.subcategories.length >= 2) {
      for (let i = 0; i < 2; i++) {
        const subcategory = category.subcategories[i];
        const service = await prisma.service.create({
          data: {
            providerId: user.id,
            categoryId: prov.categoryId,
            subcategoryId: subcategory.id,
            title: `Test Service ${i + 1} - ${prov.companyName}`,
            description: `Professional ${subcategory.name} service offered by ${prov.companyName}`,
            priceType: 'FIXED',
            priceMin: 1000 + (i * 500),
            priceMax: 2000 + (i * 500),
            country: 'Nepal',
            province: prov.location.province,
            district: prov.location.district,
            city: prov.location.city,
            latitude: prov.location.lat,
            longitude: prov.location.lng,
            availabilityType: 'IMMEDIATE',
            images: [`https://via.placeholder.com/400x300?text=Service+${i + 1}`],
            status: 'APPROVED',
            isActive: true,
            verifiedBy: 'system',
            verifiedAt: new Date(),
            averageRating: 4.5,
            totalReviews: 5,
            viewCount: 50,
            bookingCount: Math.floor(Math.random() * 15) + 3,
          },
        });
        createdServices.push(service);
        console.log(`   ✅ Created service: ${service.title}`);
      }
    }

    createdProviders.push({ user, kyc, services: createdServices });
    console.log(`✅ Created provider: ${prov.companyName} with ${createdServices.length} services`);
  }

  console.log(`\n✅ Created ${createdProviders.length} service providers with approved KYC\n`);

  // ============================================
  // STEP 3: CREATE CUSTOMERS
  // ============================================
  console.log('📋 STEP 3: Creating Customers with Individual KYC...\n');

  const customers = [
    {
      email: 'customer1@kaji.com',
      firstName: 'Ram',
      lastName: 'Sharma',
      phone: '+977-9810000001',
      fullName: 'Ram Sharma',
      gender: 'Male',
      dateOfBirth: new Date('1990-05-15'),
      nationalId: 'NEP-CUST-1234567890',
      location: LOCATIONS.kathmandu,
    },
    {
      email: 'customer2@kaji.com',
      firstName: 'Sita',
      lastName: 'Gurung',
      phone: '+977-9810000002',
      fullName: 'Sita Gurung',
      gender: 'Female',
      dateOfBirth: new Date('1988-08-20'),
      nationalId: 'NEP-CUST-1234567891',
      location: LOCATIONS.lalitpur,
    },
    {
      email: 'customer3@kaji.com',
      firstName: 'Hari',
      lastName: 'Tamang',
      phone: '+977-9810000003',
      fullName: 'Hari Tamang',
      gender: 'Male',
      dateOfBirth: new Date('1995-03-10'),
      nationalId: 'NEP-CUST-1234567892',
      location: LOCATIONS.pokhara,
    },
    {
      email: 'customer4@kaji.com',
      firstName: 'Gita',
      lastName: 'Rai',
      phone: '+977-9810000004',
      fullName: 'Gita Rai',
      gender: 'Female',
      dateOfBirth: new Date('1992-11-25'),
      nationalId: 'NEP-CUST-1234567893',
      location: LOCATIONS.bhaktapur,
    },
    {
      email: 'customer5@kaji.com',
      firstName: 'Bishal',
      lastName: 'Yadav',
      phone: '+977-9810000005',
      fullName: 'Bishal Yadav',
      gender: 'Male',
      dateOfBirth: new Date('1998-07-18'),
      nationalId: 'NEP-CUST-1234567894',
      location: LOCATIONS.itahari,
    },
  ];

  const createdCustomers: Array<{ user: any; kyc: any }> = [];

  for (const cust of customers) {
    // Create user
    const user = await prisma.user.create({
      data: {
        email: cust.email,
        password: hashedPassword,
        firstName: cust.firstName,
        lastName: cust.lastName,
        phone: cust.phone,
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    // Create individual KYC
    const kyc = await prisma.individualKYC.create({
      data: {
        userId: user.id,
        fullName: cust.fullName,
        gender: cust.gender,
        dateOfBirth: cust.dateOfBirth,
        nationalId: cust.nationalId,
        country: 'Nepal',
        province: cust.location.province,
        district: cust.location.district,
        municipality: `${cust.location.city} Metropolitan City`,
        ward: String(Math.floor(Math.random() * 35) + 1),
        street: 'Main Street',
        city: cust.location.city,
        latitude: cust.location.lat,
        longitude: cust.location.lng,
        email: cust.email,
        phone: cust.phone,
        highestQualification: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        schoolUniversity: 'Tribhuvan University',
        languagesKnown: ['Nepali', 'English'],
        employmentStatus: 'EMPLOYED',
        experience: [
          {
            years: 5,
            company: 'Tech Company',
            role: 'Software Engineer',
          },
        ],
        expectedSalaryMin: 50000,
        expectedSalaryMax: 80000,
        willingRelocate: false,
        technicalSkills: {
          'Computer Skills': 4,
          'MS Office': 4,
        },
        softSkills: {
          Communication: 4,
          Teamwork: 5,
        },
        interestDomains: ['Technology', 'Business'],
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: 'system',
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    createdCustomers.push({ user, kyc });
    console.log(`✅ Created customer: ${cust.fullName} (${cust.email})`);
  }

  console.log(`\n✅ Created ${createdCustomers.length} customers with approved KYC\n`);

  // ============================================
  // STEP 4: CREATE SAMPLE BOOKINGS
  // ============================================
  console.log('📋 STEP 4: Creating Sample Service Bookings...\n');

  const bookings = [
    // Ram (customer1) books from Raj Tech (provider1)
    {
      customerIndex: 0,
      providerIndex: 0,
      serviceIndex: 0, // Website Development
      bookingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      startTime: '10:00',
      endTime: '17:00',
      duration: 7,
      notes: 'Need responsive website for my business',
      status: 'CONFIRMED',
    },
    // Sita (customer2) books from Maya Home (provider2)
    {
      customerIndex: 1,
      providerIndex: 1,
      serviceIndex: 0, // House Cleaning
      bookingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '09:00',
      endTime: '12:00',
      duration: 3,
      notes: 'Deep cleaning for my apartment',
      status: 'COMPLETED',
    },
    // Hari (customer3) books from Creative Studio (provider4)
    {
      customerIndex: 2,
      providerIndex: 3,
      serviceIndex: 0, // Photography Services
      bookingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      startTime: '14:00',
      endTime: '18:00',
      duration: 4,
      notes: 'Wedding photography session',
      status: 'PENDING',
    },
    // Gita (customer4) books from Edu Nepal (provider5)
    {
      customerIndex: 3,
      providerIndex: 4,
      serviceIndex: 0, // Math Tutoring
      bookingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      startTime: '16:00',
      endTime: '18:00',
      duration: 2,
      notes: 'Grade 10 math tutoring for my daughter',
      status: 'CONFIRMED',
    },
  ];

  const createdBookings: any[] = [];

  for (const bookingData of bookings) {
    const customer = createdCustomers[bookingData.customerIndex];
    const provider = createdProviders[bookingData.providerIndex];
    const service = provider.services[bookingData.serviceIndex];

    if (!service) continue;

    // Calculate total price based on service pricing
    let totalPrice = 0;
    if (service.priceType === 'HOURLY' && service.hourlyRate) {
      totalPrice = Number(service.hourlyRate) * bookingData.duration;
    } else if (service.priceType === 'PROJECT_BASED' && service.priceMin) {
      totalPrice = Number(service.priceMin);
    } else {
      totalPrice = 5000; // Default fallback price
    }

    const booking = await prisma.serviceBooking.create({
      data: {
        serviceId: service.id,
        customerId: customer.user.id,
        bookingDate: new Date(), // When the booking was made
        scheduledDate: bookingData.bookingDate, // When the service is scheduled
        duration: String(bookingData.duration),
        agreedPrice: totalPrice,
        paymentMethod: 'CASH',
        serviceLocation: `${customer.kyc.city}, ${customer.kyc.district}`,
        status: bookingData.status as any,
        customerNotes: bookingData.notes,
        completedAt: bookingData.status === 'COMPLETED' ? new Date() : null,
      },
    });

    createdBookings.push(booking);
    console.log(`✅ Created booking: ${service.title} for ${customer.kyc.fullName} (${bookingData.status})`);
  }

  console.log(`\n✅ Created ${createdBookings.length} service bookings\n`);

  // ============================================
  // STEP 5: CREATE ADMIN USERS
  // ============================================
  console.log('📋 STEP 5: Creating Admin Users...\n');

  const adminUsers = [
    {
      email: 'admin@kaji.com',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+977-9800000100',
    },
    {
      email: 'moderator@kaji.com',
      firstName: 'Content',
      lastName: 'Moderator',
      phone: '+977-9800000101',
    },
  ];

  const createdAdmins: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    status: string;
  }> = [];

  for (const adminData of adminUsers) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminData.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    if (!existingAdmin) {
      const admin = await prisma.user.create({
        data: {
          email: adminData.email,
          password: hashedPassword,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          phone: adminData.phone,
          role: 'ADMIN',
          status: 'ACTIVE',
          isEmailVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      });
      createdAdmins.push(admin);
      console.log(`✅ Created admin: ${admin.email}`);
    } else {
      console.log(`⏭️  Admin already exists: ${adminData.email}`);
      createdAdmins.push(existingAdmin);
    }
  }

  console.log(`\n✅ Created ${createdAdmins.length} admin user(s)\n`);

  // ============================================
  // STEP 6: CREATE SERVICE REVIEWS
  // ============================================
  console.log('📋 STEP 6: Creating Service Reviews...\n');

  const reviews = [
    // Review for completed booking (House Cleaning by Maya Home)
    {
      bookingIndex: 1, // House Cleaning booking
      rating: 5,
      review: 'Very professional and thorough cleaning. The team was on time and did an amazing job. Highly recommend!',
      isVerified: true,
    },
    // Review for website development
    {
      bookingIndex: 0, // Website Development booking
      rating: 4,
      review: 'Delivered exactly what was requested. Good communication throughout the project. Would work with again.',
      isVerified: true,
    },
  ];

  const createdReviews: any[] = [];

  for (const reviewData of reviews) {
    const booking = createdBookings[reviewData.bookingIndex];

    if (!booking) continue;

    const review = await prisma.serviceReview.create({
      data: {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        customerId: booking.customerId,
        rating: reviewData.rating,
        review: reviewData.review,
        isVerified: reviewData.isVerified,
        qualityRating: reviewData.rating,
        timelinessRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        communicationRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        valueRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
      },
    });

    createdReviews.push(review);
    console.log(`✅ Created review: ${reviewData.rating} stars`);
  }

  console.log(`\n✅ Created ${createdReviews.length} service reviews\n`);

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n📊 KAJI SERVICE MARKETPLACE SEED SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🏢 SERVICE PROVIDERS:`);
  console.log(`   • ${createdProviders.length} Providers (INDUSTRIAL) with KYC`);
  console.log(`   • ${createdProviders.reduce((sum, p) => sum + p.services.length, 0)} Total Services`);

  console.log('\n👥 CUSTOMERS:');
  console.log(`   • ${createdCustomers.length} Customers (INDIVIDUAL) with KYC`);

  console.log('\n👑 ADMIN USERS:');
  console.log(`   • ${createdAdmins.length} Administrators (ADMIN)`);

  console.log('\n📦 DATA CREATED:');
  console.log(`   • ${createdCategories.length} Service Categories`);
  console.log(`   • ${createdBookings.length} Service Bookings`);
  console.log(`   • ${createdReviews.length} Service Reviews`);
  console.log(`   • Total Users: ${createdProviders.length + createdCustomers.length + createdAdmins.length}`);

  console.log('\n🔐 LOGIN CREDENTIALS (All passwords: Password123!):\n');

  console.log('🏢 SERVICE PROVIDERS:');
  createdProviders.forEach((prov, i) => {
    console.log(`   ${i + 1}. ${prov.kyc.companyName}`);
    console.log(`      Email: ${prov.user.email}`);
    console.log(`      Services: ${prov.services.length}`);
    console.log(`      Location: ${prov.kyc.district}, ${prov.kyc.province}`);
    console.log(`      Category: ${prov.services[0]?.categoryId || 'Multiple'}`);
  });

  console.log('\n👥 CUSTOMERS:');
  createdCustomers.forEach((cust, i) => {
    console.log(`   ${i + 1}. ${cust.kyc.fullName}`);
    console.log(`      Email: ${cust.user.email}`);
    console.log(`      Location: ${cust.kyc.district}, ${cust.kyc.province}`);
  });

  console.log('\n👑 ADMINS:');
  createdAdmins.forEach((admin, i) => {
    console.log(`   ${i + 1}. ${admin.firstName || ''} ${admin.lastName || ''}`);
    console.log(`      Email: ${admin.email}`);
    console.log(`      Role: ${admin.role}`);
  });

  console.log('\n📋 SERVICE CATEGORIES:');
  createdCategories.forEach((cat, i) => {
    console.log(`   ${i + 1}. ${cat.name} - ${cat.subcategories.length} subcategories`);
  });

  console.log('\n🎯 TESTING SCENARIOS:');
  console.log('   • Ram (customer1) booked: Website Development from Raj Tech');
  console.log('   • Sita (customer2) completed: House Cleaning from Maya Home');
  console.log('   • Hari (customer3) pending: Photography from Creative Studio');
  console.log('   • Gita (customer4) booked: Math Tutoring from Edu Nepal');

  console.log('\n📍 LOCATION MATCHING:');
  console.log('   • Kathmandu customers should find Kathmandu/Lalitpur services');
  console.log('   • Pokhara customers should find Pokhara services');
  console.log('   • All locations have service coverage');

  console.log('\n✅ Kaji Service Marketplace seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
