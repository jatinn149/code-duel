import { TestCaseResult, ExecutionVerdict } from '@code-duel/types';

export class VerdictEngine {
  static determineVerdict(
    results: TestCaseResult[],
    hasCompilationError: boolean = false,
    hasInternalError: boolean = false
  ): ExecutionVerdict {
    if (hasInternalError) return ExecutionVerdict.INTERNAL_ERROR;
    if (hasCompilationError) return ExecutionVerdict.COMPILATION_ERROR;

    if (results.some((r) => r.status === 'timeout')) {
      return ExecutionVerdict.TIME_LIMIT_EXCEEDED;
    }
    if (results.some((r) => r.status === 'memory_limit')) {
      return ExecutionVerdict.MEMORY_LIMIT_EXCEEDED;
    }
    if (results.some((r) => r.status === 'error')) {
      return ExecutionVerdict.RUNTIME_ERROR;
    }
    if (results.some((r) => r.status === 'failed')) {
      return ExecutionVerdict.WRONG_ANSWER;
    }

    if (results.length > 0 && results.every((r) => r.status === 'passed')) {
      return ExecutionVerdict.ACCEPTED;
    }

    return ExecutionVerdict.INTERNAL_ERROR;
  }
}
