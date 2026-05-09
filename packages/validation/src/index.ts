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
  cookies: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type SignupInput = z.infer<typeof signupSchema>['body'];
