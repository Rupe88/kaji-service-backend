import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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
  console.log('🌱 Starting comprehensive seed...\n');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing seed data...');
  await prisma.jobApplication.deleteMany({});
  await prisma.jobPosting.deleteMany({});
  await prisma.individualKYC.deleteMany({});
  await prisma.industrialKYC.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'employer1@example.com',
          'employer2@example.com',
          'employer3@example.com',
          'seeker1@example.com',
          'seeker2@example.com',
          'seeker3@example.com',
          'seeker4@example.com',
          'seeker5@example.com',
          'seeker6@example.com',
        ],
      },
    },
  });
  console.log('✅ Cleaned existing data\n');

  const hashedPassword = await bcrypt.hash('Password123!', 12);

  // ============================================
  // STEP 1: CREATE EMPLOYERS WITH FULL KYC
  // ============================================
  console.log('📋 STEP 1: Creating Employers with Full Industrial KYC...\n');

  const employers = [
    {
      email: 'employer1@example.com',
      firstName: 'Tech',
      lastName: 'Solutions',
      phone: '+977-9800000001',
      companyName: 'Tech Solutions Nepal',
      industrySector: 'Information Technology',
      location: LOCATIONS.kathmandu,
    },
    {
      email: 'employer2@example.com',
      firstName: 'Digital',
      lastName: 'Innovations',
      phone: '+977-9800000002',
      companyName: 'Digital Innovations Pvt. Ltd.',
      industrySector: 'Software Development',
      location: LOCATIONS.pokhara,
    },
    {
      email: 'employer3@example.com',
      firstName: 'Cloud',
      lastName: 'Services',
      phone: '+977-9800000003',
      companyName: 'Cloud Services Nepal',
      industrySector: 'Cloud Computing',
      location: LOCATIONS.lalitpur,
    },
  ];

  const createdEmployers: Array<{ user: any; kyc: any }> = [];

  for (const emp of employers) {
    const user = await prisma.user.create({
      data: {
        email: emp.email,
        password: hashedPassword,
        firstName: emp.firstName,
        lastName: emp.lastName,
        phone: emp.phone,
        role: 'INDUSTRIAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    const kyc = await prisma.industrialKYC.create({
      data: {
        userId: user.id,
        companyName: emp.companyName,
        companyEmail: emp.email,
        companyPhone: emp.phone,
        registrationNumber: `REG-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`,
        yearsInBusiness: Math.floor(Math.random() * 10) + 3,
        companySize: ['10-50', '50-100', '100-200'][
          Math.floor(Math.random() * 3)
        ],
        industrySector: emp.industrySector,
        registrationCertificate:
          'https://example.com/certificates/registration.pdf',
        taxClearanceCertificate: 'https://example.com/certificates/tax.pdf',
        panCertificate: 'https://example.com/certificates/pan.pdf',
        vatCertificate: 'https://example.com/certificates/vat.pdf',
        country: 'Nepal',
        province: emp.location.province,
        district: emp.location.district,
        municipality: `${emp.location.city} Metropolitan City`,
        ward: String(Math.floor(Math.random() * 35) + 1),
        street: 'Main Street',
        contactPersonName: `${emp.firstName} ${emp.lastName}`,
        contactPersonDesignation: 'HR Manager',
        contactPersonPhone: emp.phone,
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: 'system',
      },
    });

    createdEmployers.push({ user, kyc });
    console.log(`✅ Created employer: ${emp.companyName} (${emp.email})`);
  }

  console.log(
    `\n✅ Created ${createdEmployers.length} employers with approved KYC\n`
  );

  // ============================================
  // STEP 2: CREATE JOB POSTINGS
  // ============================================
  console.log('📋 STEP 2: Creating Job Postings...\n');

  const jobPostings = [
    {
      employerIndex: 0,
      title: 'Senior React Developer',
      description:
        'We are looking for an experienced React developer to join our team. You will be responsible for building modern web applications using React, TypeScript, and Node.js.',
      requirements:
        'Minimum 3 years of experience with React, TypeScript, and modern JavaScript. Experience with Redux, Next.js, and RESTful APIs.',
      responsibilities:
        'Develop and maintain React applications, collaborate with team members, write clean and maintainable code.',
      jobType: 'FULL_TIME_2YEAR_PLUS',
      location: LOCATIONS.kathmandu,
      isRemote: false,
      salaryMin: 80000,
      salaryMax: 120000,
      salaryType: 'MONTHLY',
      contractDuration: 24,
      requiredSkills: {
        React: 4,
        TypeScript: 4,
        'Node.js': 3,
        JavaScript: 5,
        HTML: 4,
        CSS: 4,
      },
      experienceYears: 3,
      educationLevel: 'Bachelor',
      totalPositions: 2,
    },
    {
      employerIndex: 0,
      title: 'Full Stack Developer (MERN)',
      description:
        'Join our team as a Full Stack Developer working with MongoDB, Express, React, and Node.js. Build scalable web applications from scratch.',
      requirements:
        'Strong knowledge of MERN stack, RESTful APIs, Git, and database design. Experience with cloud platforms is a plus.',
      responsibilities:
        'Design and develop full-stack applications, implement APIs, optimize database queries, deploy applications.',
      jobType: 'FULL_TIME_1YEAR',
      location: LOCATIONS.kathmandu,
      isRemote: true,
      salaryMin: 60000,
      salaryMax: 90000,
      salaryType: 'MONTHLY',
      contractDuration: 12,
      requiredSkills: {
        React: 4,
        'Node.js': 4,
        MongoDB: 4,
        Express: 4,
        JavaScript: 5,
      },
      experienceYears: 2,
      educationLevel: 'Bachelor',
      totalPositions: 3,
    },
    {
      employerIndex: 1,
      title: 'Python Developer',
      description:
        'We need a Python developer to work on backend services and data processing. Experience with Django or Flask required.',
      requirements:
        'Strong Python skills, experience with Django/Flask, REST APIs, database design, and testing frameworks.',
      responsibilities:
        'Develop backend services, create APIs, write unit tests, optimize performance.',
      jobType: 'FULL_TIME_2YEAR',
      location: LOCATIONS.pokhara,
      isRemote: false,
      salaryMin: 70000,
      salaryMax: 100000,
      salaryType: 'MONTHLY',
      contractDuration: 24,
      requiredSkills: {
        Python: 5,
        Django: 4,
        Flask: 3,
        SQL: 4,
        REST: 4,
      },
      experienceYears: 2,
      educationLevel: 'Bachelor',
      totalPositions: 2,
    },
    {
      employerIndex: 1,
      title: 'DevOps Engineer',
      description:
        'Looking for a DevOps engineer to manage our cloud infrastructure and CI/CD pipelines. AWS experience required.',
      requirements:
        'Experience with AWS, Docker, Kubernetes, CI/CD pipelines, Linux, and infrastructure as code.',
      responsibilities:
        'Manage cloud infrastructure, set up CI/CD pipelines, monitor systems, ensure high availability.',
      jobType: 'FULL_TIME_2YEAR_PLUS',
      location: LOCATIONS.pokhara,
      isRemote: true,
      salaryMin: 90000,
      salaryMax: 130000,
      salaryType: 'MONTHLY',
      contractDuration: 24,
      requiredSkills: {
        AWS: 5,
        Docker: 4,
        Kubernetes: 4,
        Linux: 4,
        CI: 4,
        CD: 4,
      },
      experienceYears: 3,
      educationLevel: 'Bachelor',
      totalPositions: 1,
    },
    {
      employerIndex: 2,
      title: 'Frontend Developer (Vue.js)',
      description:
        'Join our team to build beautiful user interfaces using Vue.js. Experience with Vue 3 and Composition API preferred.',
      requirements:
        'Strong Vue.js skills, experience with Vuex/Pinia, TypeScript, and modern build tools.',
      responsibilities:
        'Build responsive UIs, implement state management, optimize performance, collaborate with designers.',
      jobType: 'FULL_TIME_1YEAR',
      location: LOCATIONS.lalitpur,
      isRemote: false,
      salaryMin: 65000,
      salaryMax: 95000,
      salaryType: 'MONTHLY',
      contractDuration: 12,
      requiredSkills: {
        Vue: 4,
        JavaScript: 5,
        TypeScript: 3,
        HTML: 4,
        CSS: 4,
      },
      experienceYears: 2,
      educationLevel: 'Bachelor',
      totalPositions: 2,
    },
    {
      employerIndex: 2,
      title: 'Mobile App Developer (React Native)',
      description:
        'We need a React Native developer to build cross-platform mobile applications for iOS and Android.',
      requirements:
        'Experience with React Native, Redux, mobile app deployment, and native module integration.',
      responsibilities:
        'Develop mobile apps, implement features, test on devices, publish to app stores.',
      jobType: 'FULL_TIME_2YEAR',
      location: LOCATIONS.lalitpur,
      isRemote: true,
      salaryMin: 75000,
      salaryMax: 110000,
      salaryType: 'MONTHLY',
      contractDuration: 24,
      requiredSkills: {
        'React Native': 4,
        React: 4,
        JavaScript: 5,
        Redux: 3,
        'Mobile Development': 4,
      },
      experienceYears: 2,
      educationLevel: 'Bachelor',
      totalPositions: 2,
    },
  ];

  const createdJobs: any[] = [];

  for (const job of jobPostings) {
    const employer = createdEmployers[job.employerIndex];
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3); // Expires in 3 months

    const jobPosting = await prisma.jobPosting.create({
      data: {
        employerId: employer.user.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        jobType: job.jobType as any,
        country: 'Nepal',
        province: job.location.province,
        district: job.location.district,
        city: job.location.city,
        isRemote: job.isRemote,
        latitude: job.location.lat,
        longitude: job.location.lng,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryType: job.salaryType,
        contractDuration: job.contractDuration,
        requiredSkills: job.requiredSkills,
        experienceYears: job.experienceYears,
        educationLevel: job.educationLevel,
        totalPositions: job.totalPositions,
        filledPositions: 0,
        isActive: true,
        isVerified: true,
        verifiedBy: 'system',
        expiresAt,
      },
    });

    createdJobs.push(jobPosting);
    console.log(`✅ Created job: ${job.title} at ${employer.kyc.companyName}`);
  }

  console.log(`\n✅ Created ${createdJobs.length} job postings\n`);

  // ============================================
  // STEP 3: CREATE JOB SEEKERS WITH FULL KYC
  // ============================================
  console.log('📋 STEP 3: Creating Job Seekers with Full Individual KYC...\n');

  const jobSeekers = [
    {
      email: 'seeker1@example.com',
      firstName: 'Raj',
      lastName: 'Sharma',
      phone: '+977-9801000001',
      fullName: 'Raj Sharma',
      gender: 'Male',
      dateOfBirth: new Date('1995-05-15'),
      nationalId: 'NEP-1234567890',
      location: LOCATIONS.kathmandu,
      technicalSkills: {
        React: 5,
        TypeScript: 4,
        'Node.js': 4,
        JavaScript: 5,
        HTML: 5,
        CSS: 5,
        Redux: 3,
      },
      experience: [
        { years: 3, company: 'Tech Corp', role: 'Frontend Developer' },
        { years: 1, company: 'StartupXYZ', role: 'Junior Developer' },
      ],
      expectedSalaryMin: 70000,
      expectedSalaryMax: 100000,
    },
    {
      email: 'seeker2@example.com',
      firstName: 'Priya',
      lastName: 'Gurung',
      phone: '+977-9801000002',
      fullName: 'Priya Gurung',
      gender: 'Female',
      dateOfBirth: new Date('1998-08-20'),
      nationalId: 'NEP-1234567891',
      location: LOCATIONS.pokhara,
      technicalSkills: {
        Python: 5,
        Django: 4,
        Flask: 4,
        SQL: 4,
        REST: 4,
        JavaScript: 3,
      },
      experience: [
        { years: 2, company: 'DataTech', role: 'Backend Developer' },
      ],
      expectedSalaryMin: 60000,
      expectedSalaryMax: 90000,
    },
    {
      email: 'seeker3@example.com',
      firstName: 'Amit',
      lastName: 'Karki',
      phone: '+977-9801000003',
      fullName: 'Amit Karki',
      gender: 'Male',
      dateOfBirth: new Date('1993-03-10'),
      nationalId: 'NEP-1234567892',
      location: LOCATIONS.lalitpur,
      technicalSkills: {
        React: 4,
        'Node.js': 5,
        MongoDB: 5,
        Express: 5,
        JavaScript: 5,
        AWS: 3,
      },
      experience: [
        { years: 4, company: 'CloudTech', role: 'Full Stack Developer' },
        { years: 1, company: 'WebDev Inc', role: 'Junior Developer' },
      ],
      expectedSalaryMin: 80000,
      expectedSalaryMax: 120000,
    },
    {
      email: 'seeker4@example.com',
      firstName: 'Sita',
      lastName: 'Tamang',
      phone: '+977-9801000004',
      fullName: 'Sita Tamang',
      gender: 'Female',
      dateOfBirth: new Date('1997-11-25'),
      nationalId: 'NEP-1234567893',
      location: LOCATIONS.kathmandu,
      technicalSkills: {
        Vue: 4,
        JavaScript: 5,
        TypeScript: 3,
        HTML: 5,
        CSS: 5,
        'React Native': 2,
      },
      experience: [
        { years: 2, company: 'UI Design Co', role: 'Frontend Developer' },
      ],
      expectedSalaryMin: 60000,
      expectedSalaryMax: 90000,
    },
    {
      email: 'seeker5@example.com',
      firstName: 'Bikash',
      lastName: 'Rai',
      phone: '+977-9801000005',
      fullName: 'Bikash Rai',
      gender: 'Male',
      dateOfBirth: new Date('1992-07-18'),
      nationalId: 'NEP-1234567894',
      location: LOCATIONS.bhaktapur,
      technicalSkills: {
        AWS: 5,
        Docker: 5,
        Kubernetes: 4,
        Linux: 5,
        CI: 4,
        CD: 4,
        Python: 3,
      },
      experience: [
        { years: 5, company: 'InfraTech', role: 'DevOps Engineer' },
        { years: 2, company: 'CloudSys', role: 'System Admin' },
      ],
      expectedSalaryMin: 90000,
      expectedSalaryMax: 130000,
    },
    {
      email: 'seeker6@example.com',
      firstName: 'Suresh',
      lastName: 'Yadav',
      phone: '+977-9801000006',
      fullName: 'Suresh Yadav',
      gender: 'Male',
      dateOfBirth: new Date('1996-04-12'),
      nationalId: 'NEP-1234567895',
      location: LOCATIONS.itahari,
      technicalSkills: {
        Java: 5,
        Spring: 4,
        MySQL: 5,
        REST: 5,
        Microservices: 4,
        JavaScript: 3,
        Git: 4,
      },
      experience: [
        {
          years: 3,
          company: 'Enterprise Solutions',
          role: 'Backend Developer',
        },
        { years: 1, company: 'TechStart', role: 'Junior Developer' },
      ],
      expectedSalaryMin: 75000,
      expectedSalaryMax: 110000,
    },
  ];

  const createdSeekers: Array<{ user: any; kyc: any }> = [];

  for (const seeker of jobSeekers) {
    const user = await prisma.user.create({
      data: {
        email: seeker.email,
        password: hashedPassword,
        firstName: seeker.firstName,
        lastName: seeker.lastName,
        phone: seeker.phone,
        role: 'INDIVIDUAL',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });

    const kyc = await prisma.individualKYC.create({
      data: {
        userId: user.id,
        fullName: seeker.fullName,
        gender: seeker.gender,
        dateOfBirth: seeker.dateOfBirth,
        nationalId: seeker.nationalId,
        country: 'Nepal',
        province: seeker.location.province,
        district: seeker.location.district,
        municipality:
          seeker.location.city === 'Itahari'
            ? 'Itahari Sub-Metropolitan City'
            : `${seeker.location.city} Metropolitan City`,
        ward: String(Math.floor(Math.random() * 35) + 1),
        street: 'Main Street',
        city: seeker.location.city,
        latitude: seeker.location.lat,
        longitude: seeker.location.lng,
        email: seeker.email,
        phone: seeker.phone,
        highestQualification: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        schoolUniversity: 'Tribhuvan University',
        languagesKnown: ['Nepali', 'English', 'Hindi'],
        employmentStatus: 'EMPLOYED',
        experience: seeker.experience,
        expectedSalaryMin: seeker.expectedSalaryMin,
        expectedSalaryMax: seeker.expectedSalaryMax,
        willingRelocate: false,
        technicalSkills: seeker.technicalSkills,
        softSkills: {
          Communication: 4,
          Teamwork: 5,
          ProblemSolving: 4,
        },
        interestDomains: ['Technology', 'Software Development'],
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: 'system',
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    createdSeekers.push({ user, kyc });
    console.log(`✅ Created job seeker: ${seeker.fullName} (${seeker.email})`);
  }

  console.log(
    `\n✅ Created ${createdSeekers.length} job seekers with approved KYC\n`
  );

  // ============================================
  // STEP 4: CREATE JOB APPLICATIONS
  // ============================================
  console.log('📋 STEP 4: Creating Job Applications...\n');

  // Match seekers to jobs based on skills
  const applications = [
    // Raj (React expert) applies to React jobs
    { seekerIndex: 0, jobIndex: 0 }, // Senior React Developer
    { seekerIndex: 0, jobIndex: 1 }, // Full Stack Developer
    // Priya (Python expert) applies to Python job
    { seekerIndex: 1, jobIndex: 2 }, // Python Developer
    // Amit (MERN expert) applies to MERN job
    { seekerIndex: 2, jobIndex: 1 }, // Full Stack Developer
    // Sita (Vue expert) applies to Vue job
    { seekerIndex: 3, jobIndex: 4 }, // Frontend Developer (Vue.js)
    // Bikash (DevOps expert) applies to DevOps job
    { seekerIndex: 4, jobIndex: 3 }, // DevOps Engineer
    // Some additional applications
    { seekerIndex: 2, jobIndex: 0 }, // Amit also applies to React job
    { seekerIndex: 0, jobIndex: 5 }, // Raj applies to React Native job
  ];

  const statuses = [
    'PENDING',
    'REVIEWED',
    'SHORTLISTED',
    'INTERVIEW',
    'ACCEPTED',
    'REJECTED',
  ];
  const createdApplications: any[] = [];

  for (const app of applications) {
    const seeker = createdSeekers[app.seekerIndex];
    const job = createdJobs[app.jobIndex];
    const status = statuses[Math.floor(Math.random() * 3)]; // Mostly PENDING, REVIEWED, SHORTLISTED

    const application = await prisma.jobApplication.create({
      data: {
        jobId: job.id,
        applicantId: seeker.user.id,
        resumeUrl: `https://example.com/resumes/${seeker.user.id}.pdf`,
        coverLetter: `I am very interested in the ${job.title} position at your company. I believe my skills and experience make me a great fit for this role.`,
        portfolioUrl: `https://portfolio.example.com/${seeker.user.id}`,
        status,
        appliedAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ), // Random date in last 7 days
      },
    });

    createdApplications.push(application);
    console.log(
      `✅ ${seeker.kyc.fullName} applied to ${job.title} (Status: ${status})`
    );
  }

  console.log(`\n✅ Created ${createdApplications.length} job applications\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 SUMMARY:');
  console.log(`   ✅ ${createdEmployers.length} Employers with Approved KYC`);
  console.log(`   ✅ ${createdJobs.length} Job Postings`);
  console.log(`   ✅ ${createdSeekers.length} Job Seekers with Approved KYC`);
  console.log(`   ✅ ${createdApplications.length} Job Applications\n`);

  console.log('🔐 LOGIN CREDENTIALS (All passwords: Password123!):\n');

  console.log('👔 EMPLOYERS:');
  createdEmployers.forEach((emp, i) => {
    console.log(`   ${i + 1}. ${emp.kyc.companyName}`);
    console.log(`      Email: ${emp.user.email}`);
    console.log(`      Location: ${emp.kyc.district}, ${emp.kyc.province}`);
  });

  console.log('\n👤 JOB SEEKERS:');
  createdSeekers.forEach((seeker, i) => {
    console.log(`   ${i + 1}. ${seeker.kyc.fullName}`);
    console.log(`      Email: ${seeker.user.email}`);
    console.log(
      `      Location: ${seeker.kyc.district}, ${seeker.kyc.province}`
    );
    console.log(
      `      Skills: ${Object.keys(
        (seeker.kyc.technicalSkills as any) || {}
      ).join(', ')}`
    );
  });

  console.log('\n💼 JOB POSTINGS:');
  createdJobs.forEach((job, i) => {
    const employer = createdEmployers.find((e) => e.user.id === job.employerId);
    console.log(`   ${i + 1}. ${job.title}`);
    console.log(`      Company: ${employer?.kyc.companyName}`);
    console.log(`      Location: ${job.city}, ${job.district}`);
    console.log(
      `      Skills: ${Object.keys((job.requiredSkills as any) || {}).join(
        ', '
      )}`
    );
    console.log(`      Remote: ${job.isRemote ? 'Yes' : 'No'}`);
  });

  console.log('\n🎯 TESTING SKILL MATCHING:');
  console.log(
    '   • Raj (React expert) should match: Senior React Developer, Full Stack Developer'
  );
  console.log('   • Priya (Python expert) should match: Python Developer');
  console.log('   • Amit (MERN expert) should match: Full Stack Developer');
  console.log(
    '   • Sita (Vue expert) should match: Frontend Developer (Vue.js)'
  );
  console.log('   • Bikash (DevOps expert) should match: DevOps Engineer');

  console.log('\n📍 TESTING LOCATION MATCHING:');
  console.log(
    '   • Jobs in Kathmandu should match seekers in Kathmandu/Lalitpur/Bhaktapur'
  );
  console.log('   • Jobs in Pokhara should match seekers in Pokhara');
  console.log('   • Remote jobs should match all locations');

  // ============================================
  // STEP 5: CREATE ADMIN USERS
  // ============================================
  console.log('\n👤 STEP 5: Creating Admin Users...\n');

  const adminUsers = [
    {
      email: 'admin@hrplatform.com',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+977-9800000100',
    },
    {
      email: 'admin2@hrplatform.com',
      firstName: 'Admin',
      lastName: 'User',
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
      console.log(`   ✅ Created admin: ${admin.email}`);
    } else {
      console.log(`   ⏭️  Admin already exists: ${adminData.email}`);
      createdAdmins.push(existingAdmin);
    }
  }

  console.log(`\n✅ Created ${createdAdmins.length} admin user(s)\n`);

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n📊 SEED SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n👥 USERS:`);
  console.log(`   • ${createdEmployers.length} Employers (INDUSTRIAL)`);
  console.log(`   • ${createdSeekers.length} Job Seekers (INDIVIDUAL)`);
  console.log(`   • ${createdAdmins.length} Administrators (ADMIN)`);
  console.log(
    `   • Total: ${
      createdEmployers.length + createdSeekers.length + createdAdmins.length
    } users`
  );

  console.log('\n👤 ADMIN USERS:');
  createdAdmins.forEach((admin, i) => {
    console.log(
      `   ${i + 1}. ${admin.firstName || ''} ${admin.lastName || ''}`
    );
    console.log(`      Email: ${admin.email}`);
    console.log(`      Role: ${admin.role}`);
    console.log(`      Status: ${admin.status}`);
  });

  console.log('\n✅ All data seeded successfully!');
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
