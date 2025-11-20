interface SkillSet {
  [key: string]: number; // skill: proficiency level (1-5)
}

interface Location {
  province?: string;
  district?: string;
  city?: string;
}

/**
 * Skill synonyms mapping for intelligent matching
 * Handles variations like "React" = "React.js" = "ReactJS"
 */
const skillSynonyms: { [key: string]: string[] } = {
  'react': ['react.js', 'reactjs', 'react-js', 'reactjsx'],
  'node.js': ['nodejs', 'node', 'node-js'],
  'javascript': ['js', 'ecmascript', 'javascript es6'],
  'typescript': ['ts', 'typescript es6'],
  'python': ['py', 'python3', 'python 3'],
  'java': ['java 8', 'java 11', 'java 17'],
  'c++': ['cpp', 'c plus plus'],
  'c#': ['csharp', 'c-sharp', 'dotnet'],
  '.net': ['dotnet', 'asp.net'],
  'html': ['html5', 'html 5'],
  'css': ['css3', 'css 3', 'scss', 'sass'],
  'sql': ['mysql', 'postgresql', 'postgres', 'sql server'],
  'mongodb': ['mongo', 'mongo db'],
  'express': ['express.js', 'expressjs'],
  'vue': ['vue.js', 'vuejs', 'vue 3'],
  'angular': ['angularjs', 'angular 2', 'angular.js'],
  'docker': ['docker container', 'dockerfile'],
  'kubernetes': ['k8s', 'kube'],
  'aws': ['amazon web services', 'amazon aws'],
  'azure': ['microsoft azure'],
  'gcp': ['google cloud', 'google cloud platform'],
};

export interface MatchResult {
  userId: string;
  matchScore: number;
  skillMatch: number;
  locationMatch: number;
  experienceMatch: number;
  distance?: number; // Distance in kilometers
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    locationMatch: boolean;
    experienceMatch: boolean;
    distance?: number;
  };
}

/**
 * Normalize skill name for matching (handles synonyms and variations)
 */
const normalizeSkillName = (skill: string): string => {
  const normalized = skill.toLowerCase().trim();
  
  // Check if skill has synonyms
  for (const [key, synonyms] of Object.entries(skillSynonyms)) {
    if (normalized === key || synonyms.includes(normalized)) {
      return key; // Return canonical form
    }
  }
  
  return normalized;
};

/**
 * Check if two skills match (handles synonyms and variations)
 */
const skillsMatch = (skill1: string, skill2: string): boolean => {
  const normalized1 = normalizeSkillName(skill1);
  const normalized2 = normalizeSkillName(skill2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check if one is a synonym of the other
  const synonyms1 = skillSynonyms[normalized1] || [];
  const synonyms2 = skillSynonyms[normalized2] || [];
  
  if (synonyms1.includes(normalized2) || synonyms2.includes(normalized1)) {
    return true;
  }
  
  // Partial match (e.g., "React" matches "React.js")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  return false;
};

/**
 * Calculate skill matching score between required skills and user skills
 * Enhanced with skill synonyms and proficiency weighting
 */
export const calculateSkillMatch = (
  requiredSkills: SkillSet,
  userSkills: SkillSet | null
): { score: number; matched: string[]; missing: string[] } => {
  if (!userSkills || Object.keys(userSkills).length === 0) {
    return {
      score: 0,
      matched: [],
      missing: Object.keys(requiredSkills),
    };
  }

  const requiredSkillNames = Object.keys(requiredSkills);
  const userSkillNames = Object.keys(userSkills);
  
  const matched: string[] = [];
  const missing: string[] = [];
  let totalProficiencyScore = 0;
  let matchedCount = 0;

  requiredSkillNames.forEach((skill) => {
    // Find matching user skill (handles synonyms)
    const matchedUserSkill = userSkillNames.find((userSkill) =>
      skillsMatch(skill, userSkill)
    );

    if (matchedUserSkill) {
      matched.push(skill);
      matchedCount++;
      
      // Weight by proficiency level (1-5 scale)
      // Higher proficiency = higher contribution to score
      const proficiency = userSkills[matchedUserSkill] || 1;
      const proficiencyWeight = proficiency / 5; // Normalize to 0-1
      totalProficiencyScore += proficiencyWeight;
    } else {
      missing.push(skill);
    }
  });

  // Calculate score with proficiency weighting
  // Base score: percentage of skills matched
  // Proficiency bonus: average proficiency of matched skills
  const baseScore = requiredSkillNames.length > 0 
    ? (matched.length / requiredSkillNames.length) * 100 
    : 0;
  
  // Proficiency-weighted score (0-100%)
  // If all skills matched, apply proficiency bonus
  const proficiencyBonus = matchedCount > 0
    ? (totalProficiencyScore / matchedCount) * 20 // Up to 20% bonus
    : 0;
  
  const score = Math.min(100, baseScore + proficiencyBonus);

  return { 
    score: Math.round(score * 100) / 100, 
    matched, 
    missing 
  };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if location matches (enhanced with distance calculation)
 */
export const checkLocationMatch = (
  jobLocation: Location & { latitude?: number | null; longitude?: number | null },
  userLocation: Location & { latitude?: number | null; longitude?: number | null },
  isRemote: boolean = false,
  maxDistanceKm: number = 50 // Default 50km radius
): { match: boolean; distance?: number; score: number } => {
  if (isRemote) {
    return { match: true, score: 100 };
  }

  // If both have coordinates, use distance calculation
  if (
    jobLocation.latitude &&
    jobLocation.longitude &&
    userLocation.latitude &&
    userLocation.longitude
  ) {
    const distance = calculateDistance(
      jobLocation.latitude,
      jobLocation.longitude,
      userLocation.latitude,
      userLocation.longitude
    );

    // Score based on distance (closer = higher score)
    // Within 10km = 100%, 50km = 50%, beyond 50km = 0%
    let score = 0;
    if (distance <= 10) {
      score = 100;
    } else if (distance <= 50) {
      score = 100 - ((distance - 10) / 40) * 50; // Linear decrease from 100% to 50%
    }

    return {
      match: distance <= maxDistanceKm,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      score: Math.max(0, Math.round(score)),
    };
  }

  // Fallback to text-based matching if coordinates not available
  if (jobLocation.province && userLocation.province) {
    if (jobLocation.province.toLowerCase() !== userLocation.province.toLowerCase()) {
      return { match: false, score: 0 };
    }
  }

  if (jobLocation.district && userLocation.district) {
    if (jobLocation.district.toLowerCase() !== userLocation.district.toLowerCase()) {
      return { match: false, score: 50 }; // Same province, different district = 50%
    }
  }

  if (jobLocation.city && userLocation.city) {
    if (jobLocation.city.toLowerCase() !== userLocation.city.toLowerCase()) {
      return { match: true, score: 75 }; // Same district, different city = 75%
    }
  }

  return { match: true, score: 100 }; // Exact match
};

/**
 * Calculate overall match score
 */
export const calculateMatchScore = (
  skillMatch: number,
  locationScore: number, // Now accepts score (0-100) instead of boolean
  experienceMatch: boolean,
  weights: { skill: number; location: number; experience: number } = {
    skill: 0.6,
    location: 0.2,
    experience: 0.2,
  }
): number => {
  const experienceScore = experienceMatch ? 100 : 0;

  return (
    skillMatch * weights.skill +
    locationScore * weights.location +
    experienceScore * weights.experience
  );
};

/**
 * Match users to a job posting
 */
export const matchUsersToJob = async (
  jobPosting: {
    requiredSkills: any;
    province: string;
    district: string;
    city: string;
    isRemote: boolean;
    experienceYears?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  users: Array<{
    userId: string;
    technicalSkills: any;
    province: string;
    district: string;
    city?: string | null;
    experience: any;
    latitude?: number | null;
    longitude?: number | null;
  }>
): Promise<MatchResult[]> => {
  const requiredSkills = jobPosting.requiredSkills as SkillSet;
  const results: MatchResult[] = [];

  for (const user of users) {
    const userSkills = user.technicalSkills as SkillSet | null;
    const skillMatchResult = calculateSkillMatch(requiredSkills, userSkills);

    const locationMatchResult = checkLocationMatch(
      {
        province: jobPosting.province,
        district: jobPosting.district,
        city: jobPosting.city,
        latitude: jobPosting.latitude,
        longitude: jobPosting.longitude,
      },
      {
        province: user.province,
        district: user.district,
        city: user.city || undefined,
        latitude: user.latitude,
        longitude: user.longitude,
      },
      jobPosting.isRemote
    );

    // Calculate experience match
    let experienceMatch = true;
    if (jobPosting.experienceYears && jobPosting.experienceYears > 0) {
      const userExperience = user.experience as Array<{ years?: number; duration?: number }> | null;
      if (userExperience && Array.isArray(userExperience)) {
        const totalYears = userExperience.reduce((sum, exp) => {
          return sum + (exp.years || exp.duration || 0);
        }, 0);
        experienceMatch = totalYears >= jobPosting.experienceYears;
      } else {
        experienceMatch = false;
      }
    }

    const matchScore = calculateMatchScore(
      skillMatchResult.score,
      locationMatchResult.score,
      experienceMatch
    );

    results.push({
      userId: user.userId,
      matchScore: Math.round(matchScore * 100) / 100,
      skillMatch: skillMatchResult.score,
      locationMatch: locationMatchResult.score,
      experienceMatch: experienceMatch ? 100 : 0,
      distance: locationMatchResult.distance,
      details: {
        matchedSkills: skillMatchResult.matched,
        missingSkills: skillMatchResult.missing,
        locationMatch: locationMatchResult.match,
        experienceMatch,
        distance: locationMatchResult.distance,
      },
    });
  }

  // Sort by match score descending
  return results.sort((a, b) => b.matchScore - a.matchScore);
};

