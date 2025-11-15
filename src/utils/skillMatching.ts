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
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    locationMatch: boolean;
    experienceMatch: boolean;
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
 * Check if location matches
 */
export const checkLocationMatch = (
  jobLocation: Location,
  userLocation: Location,
  isRemote: boolean = false
): boolean => {
  if (isRemote) return true;

  if (jobLocation.province && userLocation.province) {
    if (jobLocation.province.toLowerCase() !== userLocation.province.toLowerCase()) {
      return false;
    }
  }

  if (jobLocation.district && userLocation.district) {
    if (jobLocation.district.toLowerCase() !== userLocation.district.toLowerCase()) {
      return false;
    }
  }

  if (jobLocation.city && userLocation.city) {
    if (jobLocation.city.toLowerCase() !== userLocation.city.toLowerCase()) {
      return false;
    }
  }

  return true;
};

/**
 * Calculate overall match score
 */
export const calculateMatchScore = (
  skillMatch: number,
  locationMatch: boolean,
  experienceMatch: boolean,
  weights: { skill: number; location: number; experience: number } = {
    skill: 0.6,
    location: 0.2,
    experience: 0.2,
  }
): number => {
  const locationScore = locationMatch ? 100 : 0;
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
  },
  users: Array<{
    userId: string;
    technicalSkills: any;
    province: string;
    district: string;
    city?: string | null;
    experience: any;
  }>
): Promise<MatchResult[]> => {
  const requiredSkills = jobPosting.requiredSkills as SkillSet;
  const results: MatchResult[] = [];

  for (const user of users) {
    const userSkills = user.technicalSkills as SkillSet | null;
    const skillMatchResult = calculateSkillMatch(requiredSkills, userSkills);

    const locationMatch = checkLocationMatch(
      {
        province: jobPosting.province,
        district: jobPosting.district,
        city: jobPosting.city,
      },
      {
        province: user.province,
        district: user.district,
        city: user.city || undefined,
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
      locationMatch,
      experienceMatch
    );

    results.push({
      userId: user.userId,
      matchScore: Math.round(matchScore * 100) / 100,
      skillMatch: skillMatchResult.score,
      locationMatch: locationMatch ? 100 : 0,
      experienceMatch: experienceMatch ? 100 : 0,
      details: {
        matchedSkills: skillMatchResult.matched,
        missingSkills: skillMatchResult.missing,
        locationMatch,
        experienceMatch,
      },
    });
  }

  // Sort by match score descending
  return results.sort((a, b) => b.matchScore - a.matchScore);
};

