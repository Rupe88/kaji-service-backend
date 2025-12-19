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
  // ============ Shopping Categories ============
  {
    name: 'Groceries',
    description: 'Grocery shopping and food items',
    icon: '🛒',
    order: 28,
    subcategories: [
      'Fresh Produce',
      'Dairy Products',
      'Meat & Seafood',
      'Bakery Items',
      'Beverages',
      'Snacks & Sweets',
      'Frozen Foods',
      'Organic Products',
    ],
  },
  {
    name: 'Beauty Supplies',
    description: 'Beauty and cosmetic products',
    icon: '💄',
    order: 29,
    subcategories: [
      'Makeup',
      'Skincare Products',
      'Hair Care',
      'Fragrances',
      'Nail Care',
      'Beauty Tools',
      'Cosmetic Accessories',
    ],
  },
  {
    name: 'Car Dealers',
    description: 'New and used car dealerships',
    icon: '🚗',
    order: 30,
    subcategories: [
      'New Cars',
      'Used Cars',
      'Car Financing',
      'Car Insurance',
      'Trade-in Services',
      'Car Accessories',
      'Car Parts',
    ],
  },
  {
    name: 'Home & Garden',
    description: 'Home improvement and gardening supplies',
    icon: '🏠',
    order: 31,
    subcategories: [
      'Furniture',
      'Home Decor',
      'Garden Tools',
      'Plants & Seeds',
      'Outdoor Furniture',
      'Lighting',
      'Kitchenware',
      'Bathroom Accessories',
    ],
  },
  {
    name: 'Apparel',
    description: 'Clothing and fashion items',
    icon: '👕',
    order: 32,
    subcategories: [
      'Men\'s Clothing',
      'Women\'s Clothing',
      'Kids\' Clothing',
      'Accessories',
      'Shoes',
      'Bags & Luggage',
      'Jewelry',
      'Watches',
    ],
  },
  {
    name: 'Shopping Centers',
    description: 'Malls and shopping complexes',
    icon: '🏬',
    order: 33,
    subcategories: [
      'Shopping Malls',
      'Department Stores',
      'Retail Outlets',
      'Marketplaces',
      'Wholesale Markets',
      'Flea Markets',
    ],
  },
  {
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    icon: '💻',
    order: 34,
    subcategories: [
      'Mobile Phones',
      'Laptops & Computers',
      'TVs & Audio',
      'Cameras',
      'Gaming Consoles',
      'Smart Home Devices',
      'Accessories',
      'Wearables',
    ],
  },
  {
    name: 'Sporting Goods',
    description: 'Sports equipment and athletic gear',
    icon: '⚽',
    order: 35,
    subcategories: [
      'Fitness Equipment',
      'Outdoor Sports',
      'Team Sports',
      'Water Sports',
      'Winter Sports',
      'Athletic Wear',
      'Sports Accessories',
    ],
  },
  {
    name: 'Convenience Store',
    description: 'Convenience stores and quick shopping',
    icon: '🏪',
    order: 36,
    subcategories: [
      'Snacks & Drinks',
      'Daily Essentials',
      'Quick Meals',
      'Personal Care',
      'Stationery',
      'Tobacco Products',
      'Lottery Tickets',
    ],
  },
  // ============ Services Categories ============
  {
    name: 'Hotels',
    description: 'Hotel and accommodation services',
    icon: '🛏️',
    order: 37,
    subcategories: [
      'Luxury Hotels',
      'Budget Hotels',
      'Boutique Hotels',
      'Resorts',
      'Guest Houses',
      'Hostels',
      'Room Booking',
      'Event Venues',
    ],
  },
  {
    name: 'ATMs',
    description: 'ATM and banking services',
    icon: '🏧',
    order: 38,
    subcategories: [
      'ATM Locations',
      'Cash Withdrawal',
      'Balance Inquiry',
      'Money Transfer',
      'Banking Services',
      'ATM Maintenance',
    ],
  },
  {
    name: 'Beauty Salons',
    description: 'Beauty salon and spa services',
    icon: '✂️',
    order: 39,
    subcategories: [
      'Haircut & Styling',
      'Hair Coloring',
      'Hair Treatment',
      'Manicure & Pedicure',
      'Facial Treatment',
      'Massage',
      'Waxing',
      'Bridal Services',
    ],
  },
  {
    name: 'Car Rental',
    description: 'Vehicle rental services',
    icon: '🔑',
    order: 40,
    subcategories: [
      'Daily Rental',
      'Weekly Rental',
      'Monthly Rental',
      'Luxury Cars',
      'Economy Cars',
      'SUV Rental',
      'Van Rental',
      'Driver Services',
    ],
  },
  {
    name: 'Car Wash',
    description: 'Vehicle cleaning and detailing services',
    icon: '🚿',
    order: 41,
    subcategories: [
      'Exterior Wash',
      'Interior Cleaning',
      'Full Detailing',
      'Wax & Polish',
      'Engine Cleaning',
      'Mobile Car Wash',
      'Self-Service Wash',
    ],
  },
  {
    name: 'Gas Stations',
    description: 'Fuel and gas station services',
    icon: '⛽',
    order: 42,
    subcategories: [
      'Petrol',
      'Diesel',
      'CNG',
      'LPG',
      'Car Wash',
      'Tire Pressure',
      'Oil Change',
      'Convenience Store',
    ],
  },
  {
    name: 'Hospitals & Clinics',
    description: 'Medical facilities and healthcare services',
    icon: '🏥',
    order: 43,
    subcategories: [
      'General Hospital',
      'Specialty Clinic',
      'Emergency Services',
      'Outpatient Services',
      'Diagnostic Center',
      'Pharmacy',
      'Laboratory',
      'Ambulance Service',
    ],
  },
  {
    name: 'Libraries',
    description: 'Library and reading services',
    icon: '📚',
    order: 44,
    subcategories: [
      'Public Library',
      'Academic Library',
      'Digital Library',
      'Book Rental',
      'Reading Room',
      'Research Services',
      'Study Space',
      'Book Exchange',
    ],
  },
  {
    name: 'Mail & Shipping',
    description: 'Postal and shipping services',
    icon: '📮',
    order: 45,
    subcategories: [
      'Postal Services',
      'Parcel Delivery',
      'Express Shipping',
      'International Shipping',
      'Package Tracking',
      'Mail Forwarding',
      'Document Services',
      'Courier Services',
    ],
  },
  {
    name: 'Parking',
    description: 'Parking facilities and services',
    icon: '🅿️',
    order: 46,
    subcategories: [
      'Public Parking',
      'Private Parking',
      'Valet Parking',
      'Monthly Parking',
      'Event Parking',
      'Parking Management',
      'Parking Reservations',
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
