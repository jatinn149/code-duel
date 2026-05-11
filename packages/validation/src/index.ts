import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const signupSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be less than 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
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
});

export const joinRoomSchema = z.object({
  roomId: z.string().uuid(),
});

export const pingSyncSchema = z.object({
  clientTime: z.string(),
});

export const telemetryEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('keystroke'), timestamp: z.string() }),
  z.object({
    type: z.literal('paste'),
    timestamp: z.string(),
    data: z.object({ length: z.number() }),
  }),
  z.object({ type: z.literal('tab_switch'), timestamp: z.string() }),
  z.object({ type: z.literal('focus_loss'), timestamp: z.string() }),
]);

export const telemetrySyncSchema = z.object({
  roomId: z.string().uuid(),
  events: z.array(telemetryEventSchema),
});

export const testCaseSchema = z.object({
  id: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
  weight: z.number().min(0),
});

export const judgeRequestSchema = z.object({
  submissionId: z.string(),
  language: z.enum(['python']),
  code: z.string(),
  testCases: z.array(testCaseSchema),
  timeLimitMs: z.number().min(100).max(10000).default(5000),
  memoryLimitMb: z.number().min(32).max(512).default(128),
});
