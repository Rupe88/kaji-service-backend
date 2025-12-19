import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Conditional import for Google Generative AI
let GoogleGenerativeAI: any = null;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (error) {
  console.warn('@google/generative-ai not installed. AI features will use fallback.');
}

export interface CategoryPurposeSuggestion {
  aiGeneratedPurposes: string[];
  exampleServices: string[];
  targetAudience: {
    primary: string[];
    secondary: string[];
  };
  commonPricingModels: string[];
}

export interface AICategorySuggestionResponse {
  purposes: string[];
  examples: string[];
  audience: {
    primary: string[];
    secondary: string[];
  };
  pricing: string[];
}

class AICategorySuggestionService {
  private googleAI: any = null;
  private useGoogleAI: boolean;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.useGoogleAI = !!apiKey && !!GoogleGenerativeAI;
    this.modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-pro';
    
    if (this.useGoogleAI && apiKey && GoogleGenerativeAI) {
      this.googleAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generate AI-powered purpose suggestions for a category
   */
  async generateCategoryPurposes(
    categoryName: string,
    categoryDescription?: string,
    subcategories?: string[]
  ): Promise<CategoryPurposeSuggestion> {
    try {
      if (this.useGoogleAI && this.googleAI) {
        return await this.generateWithGoogleAI(categoryName, categoryDescription, subcategories);
      } else {
        // Fallback to rule-based generation if Google AI is not available
        return this.generateFallbackPurposes(categoryName, categoryDescription, subcategories);
      }
    } catch (error) {
      console.error('Error generating AI purposes:', error);
      // Fallback to rule-based generation on error
      return this.generateFallbackPurposes(categoryName, categoryDescription, subcategories);
    }
  }

  /**
   * Generate purposes using Google Generative AI (Gemini)
   */
  private async generateWithGoogleAI(
    categoryName: string,
    categoryDescription?: string,
    subcategories?: string[]
  ): Promise<CategoryPurposeSuggestion> {
    if (!this.googleAI) {
      throw new Error('Google Generative AI not configured');
    }

    const prompt = this.buildPrompt(categoryName, categoryDescription, subcategories);
    
    try {
      const model = this.googleAI.getGenerativeModel({ 
        model: this.modelName,
      });
      
      const fullPrompt = `You are an expert market analyst specializing in service marketplace platforms. Generate comprehensive, practical, and market-relevant suggestions for service categories. Always respond with valid JSON only.\n\n${prompt}`;
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json',
        },
      });

      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No content received from Google Generative AI');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Google Generative AI API call failed:', error);
      throw error;
    }
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(
    categoryName: string,
    categoryDescription?: string,
    subcategories?: string[]
  ): string {
    let prompt = `Analyze the service category "${categoryName}"`;
    
    if (categoryDescription) {
      prompt += ` with description: "${categoryDescription}"`;
    }
    
    if (subcategories && subcategories.length > 0) {
      prompt += `\nSubcategories: ${subcategories.join(', ')}`;
    }
    
    prompt += `\n\nGenerate a comprehensive analysis in JSON format with the following structure:
{
  "purposes": ["use case 1", "use case 2", ...], // 5-10 common use cases
  "examples": ["example service 1", "example service 2", ...], // 5-10 example service names
  "audience": {
    "primary": ["primary target 1", "primary target 2", ...], // 3-5 primary demographics
    "secondary": ["secondary target 1", "secondary target 2", ...] // 2-4 secondary demographics
  },
  "pricing": ["pricing model 1", "pricing model 2", ...] // 3-5 common pricing structures
}

Make the suggestions practical, market-relevant, and specific to the Nepalese market context.`;

    return prompt;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(content: string): CategoryPurposeSuggestion {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          aiGeneratedPurposes: parsed.purposes || [],
          exampleServices: parsed.examples || [],
          targetAudience: {
            primary: parsed.audience?.primary || [],
            secondary: parsed.audience?.secondary || [],
          },
          commonPricingModels: parsed.pricing || [],
        };
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Fallback rule-based generation when AI is not available
   */
  generateFallbackPurposes(
    categoryName: string,
    _categoryDescription?: string,
    subcategories?: string[]
  ): CategoryPurposeSuggestion {
    // Rule-based fallback suggestions based on category name
    const categoryLower = categoryName.toLowerCase();
    
    const purposes: string[] = [];
    const examples: string[] = [];
    const primaryAudience: string[] = [];
    const secondaryAudience: string[] = [];
    const pricing: string[] = [];

    // Generate purposes based on category patterns
    if (categoryLower.includes('care') || categoryLower.includes('health')) {
      purposes.push(
        'Regular health and wellness maintenance',
        'Post-treatment recovery support',
        'Preventive care and checkups',
        'Specialized medical assistance',
        'Home-based care services'
      );
      primaryAudience.push('Adults 30-65', 'Elderly', 'People with health conditions');
      secondaryAudience.push('Families', 'Caregivers');
      pricing.push('Fixed price per session', 'Monthly packages', 'Hourly rates');
    } else if (categoryLower.includes('education') || categoryLower.includes('tutoring')) {
      purposes.push(
        'Academic support and improvement',
        'Exam preparation and test coaching',
        'Skill development and certification',
        'Language learning',
        'Homework assistance'
      );
      primaryAudience.push('Students', 'Parents seeking tutors', 'Professionals upskilling');
      secondaryAudience.push('Adults learning new skills', 'Exam candidates');
      pricing.push('Hourly rates', 'Monthly packages', 'Per course pricing');
    } else if (categoryLower.includes('beauty') || categoryLower.includes('grooming')) {
      purposes.push(
        'Regular grooming and maintenance',
        'Special occasion preparation',
        'Professional appearance',
        'Relaxation and self-care',
        'Skincare treatments'
      );
      primaryAudience.push('Adults 18-65', 'Urban professionals', 'Middle to high income');
      secondaryAudience.push('Teenagers', 'Elderly', 'Students');
      pricing.push('Fixed price per service', 'Package deals', 'Membership subscriptions');
    } else if (categoryLower.includes('repair') || categoryLower.includes('technical')) {
      purposes.push(
        'Emergency repairs and fixes',
        'Regular maintenance',
        'Installation services',
        'Troubleshooting and diagnostics',
        'Upgrade and modernization'
      );
      primaryAudience.push('Homeowners', 'Business owners', 'Property managers');
      secondaryAudience.push('Renters', 'Tenants');
      pricing.push('Fixed price per job', 'Hourly rates', 'Project-based pricing');
    } else {
      // Generic fallback
      purposes.push(
        'Professional service delivery',
        'Expert consultation',
        'Customized solutions',
        'Regular maintenance',
        'On-demand assistance'
      );
      primaryAudience.push('Adults 25-65', 'Businesses', 'Homeowners');
      secondaryAudience.push('Students', 'Elderly');
      pricing.push('Fixed price', 'Hourly rates', 'Project-based', 'Monthly packages');
    }

    // Use subcategories as examples if available
    if (subcategories && subcategories.length > 0) {
      examples.push(...subcategories.slice(0, 7));
    } else {
      examples.push(
        `${categoryName} Service 1`,
        `${categoryName} Service 2`,
        `${categoryName} Service 3`
      );
    }

    return {
      aiGeneratedPurposes: purposes.slice(0, 8),
      exampleServices: examples.slice(0, 7),
      targetAudience: {
        primary: primaryAudience.slice(0, 5),
        secondary: secondaryAudience.slice(0, 4),
      },
      commonPricingModels: pricing.slice(0, 5),
    };
  }

  /**
   * Batch generate purposes for multiple categories
   */
  async batchGeneratePurposes(
    categories: Array<{ id: string; name: string; description?: string; subcategories?: string[] }>
  ): Promise<Map<string, CategoryPurposeSuggestion>> {
    const results = new Map<string, CategoryPurposeSuggestion>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      const batchPromises = batch.map(async (category) => {
        try {
          const suggestions = await this.generateCategoryPurposes(
            category.name,
            category.description,
            category.subcategories
          );
          results.set(category.id, suggestions);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error generating purposes for ${category.name}:`, error);
          // Use fallback for this category
          const fallback = this.generateFallbackPurposes(
            category.name,
            category.description,
            category.subcategories
          );
          results.set(category.id, fallback);
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  }

  /**
   * Update category with AI-generated purposes
   */
  async updateCategoryWithPurposes(
    categoryId: string,
    purposes: CategoryPurposeSuggestion
  ): Promise<void> {
    await prisma.serviceCategory.update({
      where: { id: categoryId },
      data: {
        aiGeneratedPurposes: purposes.aiGeneratedPurposes,
        exampleServices: purposes.exampleServices,
        targetAudience: purposes.targetAudience,
        commonPricingModels: purposes.commonPricingModels,
        aiGeneratedAt: new Date(),
      },
    });
  }
}

export const aiCategorySuggestionService = new AICategorySuggestionService();
export default aiCategorySuggestionService;

