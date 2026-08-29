import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  console.log('🧹 Wiping existing problems and histories...');
  await prisma.problemHistory.deleteMany({});
  await prisma.problem.deleteMany({});

  const problemsPath = path.join(__dirname, '../data/problems.json');
  if (!fs.existsSync(problemsPath)) {
    console.error('❌ problems.json not found at', problemsPath);
    process.exit(1);
  }

  const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));
  console.log(`📦 Found ${problems.length} problems to seed.`);

  for (const problem of problems) {
    try {
      await prisma.problem.upsert({
        where: { id: String(problem.id) },
        update: {
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          compatibleModes: problem.compatibleModes,
          compatibleRounds: problem.compatibleRounds,
          speedRating: problem.speedRating,
          pressureRating: problem.pressureRating,
          estimatedSolveTimeSec: problem.estimatedSolveTimeSec,
          tags: problem.tags,
          questionType: problem.questionType,
          questionFamilyId: problem.questionFamilyId,
          realWorldDomain: problem.realWorldDomain,
          initialCode: problem.initialCode,
          solutionCode: problem.solutionCode,
          testCases: problem.testCases,
        },
        create: {
          id: String(problem.id),
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          compatibleModes: problem.compatibleModes,
          compatibleRounds: problem.compatibleRounds,
          speedRating: problem.speedRating,
          pressureRating: problem.pressureRating,
          estimatedSolveTimeSec: problem.estimatedSolveTimeSec,
          tags: problem.tags,
          questionType: problem.questionType,
          questionFamilyId: problem.questionFamilyId,
          realWorldDomain: problem.realWorldDomain,
          initialCode: problem.initialCode,
          solutionCode: problem.solutionCode,
          testCases: problem.testCases,
        },
      });
      console.log(`✅ Seeded problem: ${problem.title}`);
    } catch (error) {
      console.error(`❌ Failed to seed problem ${problem.id}:`, error);
    }
  }

  console.log('🎉 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
