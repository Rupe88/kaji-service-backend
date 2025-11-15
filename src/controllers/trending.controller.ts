import { Request, Response } from 'express';
import prisma from '../config/database';

export const getTrendingJobs = async (req: Request, res: Response) => {
  const { category, province, district, limit = '10' } = req.query;

  const where: any = {};
  if (category) where.category = category;
  if (province) where.province = province;
  if (district) where.district = district;

  const trendingJobs = await prisma.trendingJob.findMany({
    where,
    take: Number(limit),
    orderBy: {
      demandScore: 'desc',
    },
  });

  res.json({
    success: true,
    data: trendingJobs,
  });
};

export const getTrendingSkills = async (req: Request, res: Response) => {
  const { category, limit = '10' } = req.query;

  const where: any = {};
  if (category) where.category = category;

  const trendingSkills = await prisma.trendingSkill.findMany({
    where,
    take: Number(limit),
    orderBy: {
      demandScore: 'desc',
    },
  });

  res.json({
    success: true,
    data: trendingSkills,
  });
};

export const createTrendingJob = async (req: Request, res: Response) => {
  const { jobTitle, category, demandScore, totalOpenings, avgSalary, province, district } = req.body;

  const trendingJob = await prisma.trendingJob.create({
    data: {
      jobTitle,
      category,
      demandScore,
      totalOpenings,
      avgSalary,
      province,
      district,
    },
  });

  res.status(201).json({
    success: true,
    data: trendingJob,
  });
};

export const createTrendingSkill = async (req: Request, res: Response) => {
  const { skillName, category, demandScore, relatedJobs, avgSalaryImpact } = req.body;

  const trendingSkill = await prisma.trendingSkill.create({
    data: {
      skillName,
      category,
      demandScore,
      relatedJobs,
      avgSalaryImpact,
    },
  });

  res.status(201).json({
    success: true,
    data: trendingSkill,
  });
};

