import { RoundType } from '@code-duel/types';

export interface CategoryConfig {
  name: RoundType;
  durationSeconds: number;
}

export const MULTI_ROUND_CATEGORIES: CategoryConfig[] = [
  { name: RoundType.SIGNATURE_FUNCTION, durationSeconds: 300 },
  { name: RoundType.COMPLETE_CODE, durationSeconds: 300 },
  { name: RoundType.CLIENT_REQUEST, durationSeconds: 300 },
  { name: RoundType.PREDICT_OUTPUT, durationSeconds: 90 },
];
