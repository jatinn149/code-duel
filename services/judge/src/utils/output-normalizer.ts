import { TestCaseResult } from '@code-duel/types';

export class OutputNormalizer {
  static normalize(output: string): string {
    return output
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  }

  static compare(actual: string, expected: string): boolean {
    const normActual = this.normalize(actual);
    const normExpected = this.normalize(expected);
    return normActual === normExpected;
  }

  static getResultStatus(
    actual: string,
    expected: string,
    exitCode: number,
    _stderr: string,
    timeout: boolean,
  ): TestCaseResult['status'] {
    if (timeout) return 'timeout';
    if (exitCode !== 0) return 'error';
    if (this.compare(actual, expected)) return 'passed';
    return 'failed';
  }
}
