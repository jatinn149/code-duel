import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting JSON to PostgreSQL Migration...');

  try {
    // 1. Migrate Problems
    const problemsPath = path.resolve(__dirname, '../../data/problems.json');
    if (await fs.stat(problemsPath).catch(() => false)) {
      const problemsData = JSON.parse(await fs.readFile(problemsPath, 'utf-8'));
      console.log(`Found ${problemsData.length} problems to migrate.`);
      for (const p of problemsData) {
        await prisma.problem.upsert({
          where: { id: p.id },
          update: {},
          create: {
            id: p.id,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty,
            timeLimit: p.timeLimit,
            memoryLimit: p.memoryLimit,
            compatibleModes: p.compatibleModes || [],
            compatibleRounds: p.compatibleRounds || [],
            speedRating: p.speedRating || 5,
            pressureRating: p.pressureRating || 5,
            estimatedSolveTimeSec: p.estimatedSolveTimeSec || 300,
            tags: p.tags || [],
            questionType: p.questionType || 'SIGNATURE_FUNCTION',
            questionFamilyId: p.questionFamilyId,
            realWorldDomain: p.realWorldDomain,
            initialCode: p.initialCode,
            solutionCode: p.solutionCode,
          },
        });
      }
      console.log('Problems migrated successfully.');
    }

    // 2. Migrate Users
    const usersPath = path.resolve(__dirname, '../../data/users.json');
    if (await fs.stat(usersPath).catch(() => false)) {
      const usersData = JSON.parse(await fs.readFile(usersPath, 'utf-8'));
      console.log(`Found ${usersData.length} users to migrate.`);
      for (const u of usersData) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {},
          create: {
            id: u.id,
            username: u.username,
            email: u.email,
            passwordHash: u.passwordHash,
            role: u.role || 'USER',
            tokenVersion: u.tokenVersion || 0,
            matchesPlayed: u.matchesPlayed || 0,
            matchesWon: u.matchesWon || 0,
            rating: u.rating || 1000,
            xp: u.xp || 0,
            level: u.level || 1,
            rank: u.rank || 'UNRANKED',
            wins: u.wins || 0,
            losses: u.losses || 0,
            streak: u.streak || 0,
            highestStreak: u.highestStreak || 0,
            highestRating: u.highestRating || 1000,
            status: u.status || 'OFFLINE',
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          },
        });

        // Migrate Problem History if present in the JSON user object
        if (u.solvedProblemHistory && u.solvedProblemHistory.length > 0) {
            for (const h of u.solvedProblemHistory) {
                await prisma.problemHistory.create({
                    data: {
                        userId: u.id,
                        problemId: h.problemId,
                        familyId: h.familyId,
                        modePlayed: h.modePlayed,
                        solvedAt: new Date(h.solvedAt),
                        result: h.result,
                        attempts: h.attempts,
                        completionSpeedMs: h.completionSpeedMs,
                    }
                });
            }
        }
      }
      console.log('Users migrated successfully.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
