import { describe, it, expect } from 'vitest';
import { toCSV } from './csv';

describe('toCSV', () => {
  it('joins headers + rows with CRLF', () => {
    expect(toCSV(['a','b'], [[1,2],[3,4]])).toBe('a,b\r\n1,2\r\n3,4');
  });
  it('escapes commas, quotes, and newlines', () => {
    expect(toCSV(['x'], [['a,b']])).toBe('x\r\n"a,b"');
    expect(toCSV(['x'], [['he said "hi"']])).toBe('x\r\n"he said ""hi"""');
    expect(toCSV(['x'], [['line1\nline2']])).toBe('x\r\n"line1\nline2"');
  });
  it('treats null/undefined as empty', () => {
    expect(toCSV(['x'], [[null as any]])).toBe('x\r\n');
  });
});
