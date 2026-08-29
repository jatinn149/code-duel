import { IProblemRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';
import { Problem, ProblemType, GameMode, RoundType } from '@code-duel/types';

export class JsonProblemRepository implements IProblemRepository {
  private collection = 'problems';

  constructor(private storage: JsonStorageAdapter) {}

  private async getProblems(): Promise<Problem[]> {
    let problems = await this.storage.read<Problem>(this.collection);
    if (problems.length === 0) {
       const initialProblems: Problem[] = [
         { 
           id: '1', 
           title: 'Inventory Two Sum (Fintech)', 
           description: 'Find two prices in the array that add up to the target budget.',
           difficulty: 2, 
           tags: ['array', 'hashmap'],
           timeLimit: 2000,
           memoryLimit: 128,
           compatibleModes: [GameMode.MULTI_ROUND, GameMode.QUICKODE, GameMode.CHAOS_ARENA],
           compatibleRounds: [RoundType.SPEED, RoundType.COMPLETION],
           speedRating: 8,
           pressureRating: 3,
           estimatedSolveTimeSec: 60,
           questionType: ProblemType.SIGNATURE_FUNCTION,
           questionFamilyId: 'FAM_TWO_SUM',
           realWorldDomain: 'fintech'
         },
         { 
           id: '2', 
           title: 'Fix Cache Expiration', 
           description: 'The current caching function drops items too early. Fix the bug.',
           difficulty: 4, 
           tags: ['debugging', 'hashmap'],
           timeLimit: 1000,
           memoryLimit: 64,
           compatibleModes: [GameMode.MULTI_ROUND, GameMode.QUICKODE],
           compatibleRounds: [RoundType.DEBUG],
           speedRating: 5,
           pressureRating: 7,
           estimatedSolveTimeSec: 120,
           questionType: ProblemType.DEBUGGING,
           questionFamilyId: 'FAM_CACHE_DEBUG',
           realWorldDomain: 'ecommerce'
         },
         { 
           id: '3', 
           title: 'Optimize Delivery Route', 
           description: 'The current O(N^2) loop is too slow for 10,000+ points. Optimize it.',
           difficulty: 7, 
           tags: ['optimization', 'sorting'],
           timeLimit: 500,
           memoryLimit: 256,
           compatibleModes: [GameMode.MULTI_ROUND],
           compatibleRounds: [RoundType.OPTIMIZATION],
           speedRating: 3,
           pressureRating: 9,
           estimatedSolveTimeSec: 300,
           questionType: ProblemType.OPTIMIZATION,
           questionFamilyId: 'FAM_ROUTE_OPT',
           realWorldDomain: 'logistics'
         }
       ];
       await this.storage.write(this.collection, initialProblems);
       problems = initialProblems;
    }
    return problems;
  }

  async findById(id: string): Promise<Problem | null> {
    const problems = await this.getProblems();
    return problems.find((p) => String(p.id) === id) || null;
  }

  async findAll(): Promise<Problem[]> {
    return this.getProblems();
  }

  async create(problem: Problem): Promise<Problem> {
    const problems = await this.getProblems();
    problems.push(problem);
    await this.storage.write(this.collection, problems);
    return problem;
  }

  async findByDifficulty(difficulty: number): Promise<Problem[]> {
    const problems = await this.getProblems();
    const filtered = problems.filter((p) => p.difficulty === difficulty);
    return filtered;
  }
}
