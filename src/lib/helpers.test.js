import { describe, it, expect } from 'vitest';
import { normalizeZoneName, getZoneFromWard } from './helpers.js';

describe('Helpers test suite', () => {
  it('should normalize zone names correctly', () => {
    expect(normalizeZoneName('Court Road Junction')).toBe('Court Corridor');
    expect(normalizeZoneName('Kannoth–Court Corridor')).toBe('Court Corridor');
  });

  it('should get zone from ward correctly', () => {
    expect(getZoneFromWard('53')).toBe('Chirakkara Hills');
    expect(getZoneFromWard('1')).toBe('North Uplands');
  });
});
