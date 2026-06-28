import { describe, it, expect } from 'vitest';
import { cn } from './utils.js';

describe('utils cn helper', () => {
  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('px-2 py-1', null, undefined, false)).toBe('px-2 py-1');
  });
});
