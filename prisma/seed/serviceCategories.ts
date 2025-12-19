/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import aiCategorySuggestionService from '../../src/services/aiCategorySuggestion.service';

const prisma = new PrismaClient();
const USE_AI_FOR_SEEDING = process.env.USE_AI_FOR_CATEGORY_SEEDING === 'true';

const categories = [
  {
    name: 'Personal Care Services',
    description: 'Personal grooming and care services',
    icon: '💆',
    order: 1,
    subcategories: ['Haircut', 'Spa', 'Massage', 'Salon', 'Facial', 'Waxing'],
  },
  {
    name: 'Beauty & Grooming',
    description: 'Beauty and grooming professional services',
    icon: '💄',
    order: 2,
    subcategories: [
      'Makeup',
      'Nail Art',
      'Hair Styling',
      'Skin Care',
      'Bridal Makeup',
      'Hair Color',
    ],
  },
  {
    name: 'Health & Medical',
    description: 'Health and medical services',
    icon: '🏥',
    order: 3,
    subcategories: [
      'Doctor Consultation',
      'Physiotherapy',
      'Nursing',
      'Lab Tests',
      'Home Care',
      'Dental',
    ],
  },
  {
    name: 'Education & Tutoring',
    description: 'Educational and tutoring services',
    icon: '📚',
    order: 4,
    subcategories: [
      'School Tutor',
      'Language Teacher',
      'Music Teacher',
      'Online Classes',
      'Exam Prep',
      'College Counseling',
    ],
  },
  {
    name: 'Training & Coaching',
    description: 'Professional training and coaching',
    icon: '🏋️',
    order: 5,
    subcategories: [
      'Fitness Coach',
      'Life Coach',
      'Career Counseling',
      'Business Coach',
      'Sports Training',
      'Yoga Instructor',
    ],
  },
  {
    name: 'Household Services',
    description: 'Home maintenance and household services',
    icon: '🏠',
    order: 6,
    subcategories: [
      'House Cleaning',
      'Cooking',
      'Laundry',
      'Pest Control',
      'Deep Cleaning',
      'Gardening',
    ],
  },
  {
    name: 'Child & Elder Care',
    description: 'Care services for children and elderly',
    icon: '👶',
    order: 7,
    subcategories: [
      'Babysitting',
      'Elderly Support',
      'Nanny',
      'Caretaker',
      'Daycare',
      'Companion Care',
    ],
  },
  {
    name: 'Technical Repair',
    description: 'Technical repair and maintenance',
    icon: '🔧',
    order: 8,
    subcategories: [
      'Electrician',
      'Plumber',
      'AC Repair',
      'Appliance Repair',
      'Phone Repair',
      'Computer Repair',
    ],
  },
  {
    name: 'Construction & Renovation',
    description: 'Construction and renovation services',
    icon: '🏗️',
    order: 9,
    subcategories: [
      'Painting',
      'Carpentry',
      'Masonry',
      'Interior Design',
      'Tiling',
      'Roofing',
    ],
  },
  {
    name: 'Automotive Services',
    description: 'Vehicle repair and maintenance',
    icon: '🚗',
    order: 10,
    subcategories: [
      'Mechanic',
      'Bike Repair',
      'Car Wash',
      'Towing',
      'Auto Detailing',
      'Oil Change',
    ],
  },
  {
    name: 'IT & Digital Services',
    description: 'Information technology services',
    icon: '💻',
    order: 11,
    subcategories: [
      'App Development',
      'Web Design',
      'Cybersecurity',
      'IT Support',
      'Software Development',
      'Cloud Services',
    ],
  },
  {
    name: 'Creative & Media',
    description: 'Creative and media production',
    icon: '🎨',
    order: 12,
    subcategories: [
      'Photography',
      'Video Editing',
      'Graphic Design',
      'Content Writing',
      'Animation',
      'Voice Over',
    ],
  },
  {
    name: 'Marketing & Branding',
    description: 'Marketing and brand development',
    icon: '📢',
    order: 13,
    subcategories: [
      'SEO',
      'Social Media Ads',
      'Brand Strategy',
      'Digital Marketing',
      'Email Marketing',
      'PR Services',
    ],
  },
  {
    name: 'Financial & Accounting',
    description: 'Financial and accounting services',
    icon: '💰',
    order: 14,
    subcategories: [
      'Tax Filing',
      'Bookkeeping',
      'Audit',
      'Financial Planning',
      'Investment Advice',
      'Payroll',
    ],
  },
  {
    name: 'Legal & Compliance',
    description: 'Legal and compliance services',
    icon: '⚖️',
    order: 15,
    subcategories: [
      'Lawyer',
      'Document Preparation',
      'Legal Consulting',
      'Notary',
      'Contract Review',
      'IP Services',
    ],
    
  },
  {
    name: 'Business Support',
    description: 'Business support and administrative services',
    icon: '💼',
    order: 16,
    subcategories: [
      'HR Outsourcing',
      'Data Entry',
      'Virtual Assistant',
      'Call Center',
      'Customer Support',
      'Admin Services',
    ],
  },
  {
    name: 'Hospitality & Tourism',
    description: 'Hospitality and tourism services',
    icon: '🏨',
    order: 17,
    subcategories: [
      'Hotels',
      'Travel Guide',
      'Tour Operator',
      'Restaurant',
      'Guest House',
      'Travel Planning',
    ],
  },
  {
    name: 'Transport & Delivery',
    description: 'Transportation and delivery services',
    icon: '🚚',
    order: 18,
    subcategories: [
      'Taxi',
      'Parcel Delivery',
      'Moving Services',
      'Courier',
      'Rental Vehicle',
      'Logistics',
    ],
  },
  {
    name: 'Event & Entertainment',
    description: 'Event planning and entertainment',
    icon: '🎉',
    order: 19,
    subcategories: [
      'Wedding Planning',
      'DJ',
      'Catering',
      'Decoration',
      'Photography',
      'Event Management',
    ],
  },
  {
    name: 'Agriculture & Handyman Services',
    description: 'Agricultural and general handyman services',
    icon: '🌾',
    order: 20,
    subcategories: [
      'Farming Help',
      'Gardening',
      'Landscaping',
      'General Handyman',
      'Irrigation',
      'Harvesting',
    ],
  },
  {
    name: 'Real Estate Services',
    description: 'Real estate and property services',
    icon: '🏘️',
    order: 21,
    subcategories: [
      'Property Showcase',
      'Property Listing',
      'Real Estate Agent',
      'Property Valuation',
      'Property Inspection',
      'Property Management',
    ],
  },
  {
    name: 'Property Rental',
    description: 'Property rental and leasing services',
    icon: '🏡',
    order: 22,
    subcategories: [
      'House Rental',
      'Apartment Rental',
      'Commercial Space Rental',
      'Land Rental',
      'Short-term Rental',
      'Long-term Rental',
    ],
  },
  {
    name: 'Transportation Services',
    description: 'Transportation and logistics services',
    icon: '🚕',
    order: 23,
    subcategories: [
      'Taxi Service',
      'Ride Sharing',
      'Vehicle Rental',
      'Moving Services',
      'Logistics',
      'Delivery Service',
    ],
  },
  {
    name: 'Export & Import Services',
    description: 'International trade and commerce services',
    icon: '🌍',
    order: 24,
    subcategories: [
      'Export Services',
      'Import Services',
      'Customs Clearance',
      'Shipping',
      'Trade Consulting',
      'Documentation',
    ],
  },
  {
    name: 'Banking & Financial Services',
    description: 'Banking and financial consulting services',
    icon: '🏦',
    order: 25,
    subcategories: [
      'Banking Services',
      'Loan Services',
      'Financial Consulting',
      'Currency Exchange',
      'Investment Banking',
      'Financial Planning',
    ],
  },
  {
    name: 'Investment Services',
    description: 'Investment and wealth management services',
    icon: '📈',
    order: 26,
    subcategories: [
      'Investment Advisory',
      'Portfolio Management',
      'Stock Trading',
      'Mutual Funds',
      'Wealth Management',
      'Financial Analysis',
    ],
  },
  {
    name: 'Fashion Design Services',
    description: 'Fashion design and styling services',
    icon: '👗',
    order: 27,
    subcategories: [
      'Fashion Design',
      'Clothing Alteration',
      'Tailoring',
      'Fashion Styling',
      'Costume Design',
      'Textile Design',
    ],
  },
];

export async function seedServiceCategories() {
  console.log('🌱 Seeding service categories...');
  if (USE_AI_FOR_SEEDING) {
    console.log('🤖 AI-powered seeding enabled');
  } else {
    console.log('📝 Using fallback seeding (set USE_AI_FOR_CATEGORY_SEEDING=true to enable AI)');
  }

  try {
    const categoriesToProcess = categories.map(cat => ({
      ...cat,
      id: '', // Will be set after creation
    }));

    // First, create all categories and subcategories
    for (const category of categories) {
      const { subcategories, ...categoryData } = category;

      // Create or update category
      const createdCategory = await prisma.serviceCategory.upsert({
        where: { name: categoryData.name },
        update: categoryData,
        create: categoryData,
      });

      console.log(`✅ Created category: ${createdCategory.name}`);

      // Create subcategories
      for (const subcat of subcategories) {
        await prisma.serviceSubcategory.upsert({
          where: {
            categoryId_name: {
              categoryId: createdCategory.id,
              name: subcat,
            },
          },
          update: {},
          create: {
            categoryId: createdCategory.id,
            name: subcat,
            isActive: true,
          },
        });
      }

      console.log(`   ✅ Created ${subcategories.length} subcategories`);

      // Generate AI purposes if enabled
      if (USE_AI_FOR_SEEDING) {
        try {
          console.log(`   🤖 Generating AI purposes for ${createdCategory.name}...`);
          const aiPurposes = await aiCategorySuggestionService.generateCategoryPurposes(
            createdCategory.name,
            createdCategory.description || undefined,
            subcategories
          );

          await prisma.serviceCategory.update({
            where: { id: createdCategory.id },
            data: {
              aiGeneratedPurposes: aiPurposes.aiGeneratedPurposes,
              exampleServices: aiPurposes.exampleServices,
              targetAudience: aiPurposes.targetAudience,
              commonPricingModels: aiPurposes.commonPricingModels,
              aiGeneratedAt: new Date(),
            },
          });

          console.log(`   ✅ AI purposes generated for ${createdCategory.name}`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`   ⚠️  Failed to generate AI purposes for ${createdCategory.name}:`, error);
          console.log(`   📝 Using fallback purposes`);
          
          // Use fallback
          const fallbackPurposes = aiCategorySuggestionService.generateFallbackPurposes(
            createdCategory.name,
            createdCategory.description || undefined,
            subcategories
          );

          await prisma.serviceCategory.update({
            where: { id: createdCategory.id },
            data: {
              aiGeneratedPurposes: fallbackPurposes.aiGeneratedPurposes,
              exampleServices: fallbackPurposes.exampleServices,
              targetAudience: fallbackPurposes.targetAudience,
              commonPricingModels: fallbackPurposes.commonPricingModels,
              aiGeneratedAt: new Date(),
            },
          });
        }
      } else {
        // Use fallback purposes even when AI is disabled
        const fallbackPurposes = aiCategorySuggestionService.generateFallbackPurposes(
          createdCategory.name,
          createdCategory.description || undefined,
          subcategories
        );

        await prisma.serviceCategory.update({
          where: { id: createdCategory.id },
          data: {
            aiGeneratedPurposes: fallbackPurposes.aiGeneratedPurposes,
            exampleServices: fallbackPurposes.exampleServices,
            targetAudience: fallbackPurposes.targetAudience,
            commonPricingModels: fallbackPurposes.commonPricingModels,
            aiGeneratedAt: new Date(),
          },
        });
      }
    }

    console.log('✅ Service categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

// Run seed if executed directly (CommonJS check). The triple-slash reference above
// provides Node typings so `require` and `process` are recognized by TypeScript.
if (require && require.main === module) {
  seedServiceCategories()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
