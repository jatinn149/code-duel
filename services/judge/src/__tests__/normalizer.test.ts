import { describe, it, expect } from 'vitest';
import { OutputNormalizer } from '../utils/output-normalizer';

describe('OutputNormalizer', () => {
  it('should normalize whitespace and line endings', () => {
    const input = '  Hello World  \r\nLine 2   ';
    const expected = 'Hello World\nLine 2';
    expect(OutputNormalizer.normalize(input)).toBe(expected);
  });

  it('should compare normalized outputs correctly', () => {
    expect(OutputNormalizer.compare('test\n', 'test  ')).toBe(true);
    expect(OutputNormalizer.compare('1 2 3', '1 2 3\r\n')).toBe(true);
    expect(OutputNormalizer.compare('a', 'b')).toBe(false);
  });

  it('should determine status correctly', () => {
    expect(OutputNormalizer.getResultStatus('out', 'out', 0, '', false)).toBe('passed');
    expect(OutputNormalizer.getResultStatus('out', 'diff', 0, '', false)).toBe('failed');
    expect(OutputNormalizer.getResultStatus('', '', 1, 'err', false)).toBe('error');
    expect(OutputNormalizer.getResultStatus('', '', 137, '', true)).toBe('timeout');
  });
});
