import { describe, it, expect } from 'vitest';
import { WARD_POLYGONS } from './ward_polygons.js';

describe('Ward Polygons Data test suite', () => {
  it('should export WARD_POLYGONS as a valid array of wards with properties', () => {
    expect(Array.isArray(WARD_POLYGONS)).toBe(true);
    expect(WARD_POLYGONS.length).toBe(53);
    
    const ward1 = WARD_POLYGONS.find(w => w.wardNo === 1);
    expect(ward1).toBeDefined();
    expect(ward1.id).toBe('ward-1');
    expect(Array.isArray(ward1.centroid)).toBe(true);
    expect(Array.isArray(ward1.polygon)).toBe(true);
  });
});
