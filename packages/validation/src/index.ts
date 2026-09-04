import { z } from 'zod';
import { ROOM_CODE_REGEX, normalizeRoomCode } from '@code-duel/shared';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').max(255, 'Email cannot exceed 255 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password cannot exceed 100 characters'),
  }),
});

export const signupSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be less than 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address').max(255, 'Email cannot exceed 255 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password cannot exceed 100 characters'),
    skillRating: z.number().min(1).max(10).optional().default(5),
  }),
});

export const refreshTokenSchema = z.object({
  cookies: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type SignupInput = z.infer<typeof signupSchema>['body'];

// Socket Event Schemas
export const createRoomSchema = z.object({
  maxPlayers: z.number().min(2).max(4).default(2),
  gameMode: z.string().max(50).optional(),
  options: z.object({
    duration: z.number().min(30).max(3600).optional(),
    categories: z.array(z.string().max(50)).max(10).optional(),
  }).optional(),
});

export const joinRoomSchema = z.object({
  roomId: z.string().max(100).transform(normalizeRoomCode).pipe(z.string().regex(ROOM_CODE_REGEX, 'Invalid code format')),
});

export const pingSyncSchema = z.object({
  clientTime: z.string().max(100),
});

export const telemetryEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('keystroke'), timestamp: z.string().max(100) }),
  z.object({
    type: z.literal('paste'),
    timestamp: z.string().max(100),
    data: z.object({ length: z.number().min(0).max(65536) }),
  }),
  z.object({ type: z.literal('tab_switch'), timestamp: z.string().max(100) }),
  z.object({ type: z.literal('focus_loss'), timestamp: z.string().max(100) }),
]);

export const telemetrySyncSchema = z.object({
  roomId: z.string().max(100).transform(normalizeRoomCode).pipe(z.string().regex(ROOM_CODE_REGEX, 'Invalid code format')),
  events: z.array(telemetryEventSchema).max(1000, 'Cannot sync more than 1000 telemetry events at once'),
});

export const testCaseSchema = z.object({
  id: z.string().max(100),
  input: z.string().max(65536),
  expectedOutput: z.string().max(65536),
  isHidden: z.boolean(),
  weight: z.number().min(0).max(1000),
});

export const judgeRequestSchema = z.object({
  submissionId: z.string().max(100),
  language: z.enum(['python']),
  code: z.string().max(65536),
  testCases: z.array(testCaseSchema).max(100),
  timeLimitMs: z.number().min(100).max(10000).default(5000),
  memoryLimitMb: z.number().min(32).max(512).default(128),
});

// Added secure Socket payload schemas (Issue 2)
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message cannot exceed 500 characters'),
});

export const codeSyncSchema = z.object({
  code: z.string().max(65536, 'Code sync payload cannot exceed 64KB'),
});

export const submitCodeSchema = z.object({
  code: z.string().max(65536, 'Code cannot exceed 64KB'),
  keystrokes: z.number().min(0).max(1000000).optional(),
});

export const runCodeSchema = z.object({
  code: z.string().max(65536, 'Code cannot exceed 64KB'),
});

export const submitMathAnswerSchema = z.object({
  answer: z.number().min(-1e9).max(1e9),
});

export const acceptMatchSchema = z.object({
  matchId: z.string().max(100),
});
