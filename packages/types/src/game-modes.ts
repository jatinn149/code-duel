export enum GameMode {
  MULTI_ROUND = 'MULTI_ROUND',
  QUICKODE = 'QUICKODE',
  CHAOS_ARENA = 'CHAOS_ARENA',
}

export enum RoundType {
  SPEED = 'SPEED',
  DEBUG = 'DEBUG',
  CLIENT = 'CLIENT',
  OPTIMIZATION = 'OPTIMIZATION',
  COMPLETION = 'COMPLETION',
  ALGORITHMIC = 'ALGORITHMIC',
  REFACTORING = 'REFACTORING',
  COMPLEXITY = 'COMPLEXITY',
  LOGIC = 'LOGIC',
  RECURSION = 'RECURSION',
  GRAPHS = 'GRAPHS',
  DP = 'DP',
  STRINGS = 'STRINGS',
  SQL = 'SQL',
  OOP = 'OOP',
  DATA_STRUCTURES = 'DATA_STRUCTURES',
  PATTERN_RECOGNITION = 'PATTERN_RECOGNITION',
  SIGNATURE_FUNCTION = 'SIGNATURE_FUNCTION',
  COMPLETE_CODE = 'COMPLETE_CODE',
  CLIENT_REQUEST = 'CLIENT_REQUEST',
  PREDICT_OUTPUT = 'PREDICT_OUTPUT',
}

export enum MatchFormat {
  TWO_PLAYER = 'TWO_PLAYER',
  FOUR_PLAYER = 'FOUR_PLAYER',
}

export enum MatchRuleSet {
  RANKED = 'RANKED',
  CASUAL = 'CASUAL',
  CHAOS = 'CHAOS',
}

export interface RoundSubmission {
  userId: string;
  code: string;
  language: string;
  status: string; // e.g., 'ACCEPTED', 'WRONG_ANSWER', 'PENDING'
  executionTimeMs?: number;
  memoryBytes?: number;
  submittedAt: string;
  testResults?: import('./index.js').TestCaseResult[];
  attempts?: number;
  score?: number;
  correctnessScore?: number;
  efficiencyScore?: number;
  speedScore?: number;
}

export interface RoundResult {
  roundIndex: number;
  winner?: string;
  scores: Record<string, number>;
}

export interface RoundTimer {
  duration: number;
  startedAt?: string;
  endsAt?: string;
}

export interface ClientProblem {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  initialCode?: string;
}

export interface Round {
  roundIndex: number;
  roundType: RoundType;
  problemId: string;
  duration: number; // in seconds
  startedAt?: string;
  endedAt?: string;
  roundStartedAt?: string;
  roundEndsAt?: string;
  submissions: Record<string, RoundSubmission>;
  winner?: string;
  metadata?: Record<string, any>;
  problem?: ClientProblem;
}

// Additional enums for question classification
export enum ProblemType {
  SIGNATURE_FUNCTION = 'SIGNATURE_FUNCTION',
  DEBUGGING = 'DEBUGGING',
  OPTIMIZATION = 'OPTIMIZATION',
  CODE_COMPLETION = 'CODE_COMPLETION',
  CLIENT_REQUEST = 'CLIENT_REQUEST',
  OUTPUT_PREDICTION = 'OUTPUT_PREDICTION',
  HARD_LOGIC = 'HARD_LOGIC',
}

export type DifficultyTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyTier;
  timeLimit: number;
  memoryLimit: number;
  
  // New schema additions for game modes
  compatibleModes: GameMode[];
  compatibleRounds: RoundType[];
  speedRating: number;
  pressureRating: number;
  estimatedSolveTimeSec: number;
  tags: string[];
  questionType: ProblemType;
  questionFamilyId: string;
  realWorldDomain?: string;
  
  // Existing fields
  testCases?: any[];
  initialCode?: string;
  solutionCode?: string;
}

export enum PowerupType {
  FREEZE_OPPONENT = 'FREEZE_OPPONENT',
  TIME_STEAL = 'TIME_STEAL',
  SHIELD = 'SHIELD',
  REVEAL_PROGRESS = 'REVEAL_PROGRESS',
  SUDDEN_DEATH = 'SUDDEN_DEATH',
  SPEED_BOOST = 'SPEED_BOOST',
}

export interface PowerupState {
  type: PowerupType;
  activatedBy: string;
  targetId?: string;
  activatedAt: string;
  expiresAt: string;
}

export enum ChaosEventType {
  CODE_SWAP = 'CODE_SWAP',
  LIGHTNING_MATH = 'LIGHTNING_MATH',
  FREE_DRY_RUN = 'FREE_DRY_RUN',
  BONUS_ACCEPTED = 'BONUS_ACCEPTED',
  TIME_WARP = 'TIME_WARP',
  OPPONENT_CODE_VIEW = 'OPPONENT_CODE_VIEW',
  EDITOR_FREEZE = 'EDITOR_FREEZE',
}

export interface ChaosEventState {
  type: ChaosEventType;
  activatedAt: string;
  expiresAt: string;
  durationMs: number;
  data?: Record<string, any>;
}
