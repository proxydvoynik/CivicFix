import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  useState: (initialValue) => {
    const val = typeof initialValue === 'function' ? initialValue() : initialValue;
    return [val, vi.fn()];
  },
  useEffect: vi.fn(),
  useMemo: (factory) => factory(),
}));

vi.mock('./CardShell.jsx', () => ({
  default: ({ children, className }) => ({
    type: 'CardShell',
    props: { children, className }
  })
}));

vi.mock('../lib/helpers.js', () => ({
  WARD_ZONES: [],
  ZONE_MAPPING: {},
  getCategoryInfo: vi.fn(() => ({ color: 'blue', label: 'Test Category' })),
  getZoneHealthScore: vi.fn(() => 100),
  getZoneSummary: vi.fn(() => ({ count: 0, criticalCount: 0 })),
  filterAlerts: vi.fn(() => [])
}));

import LeftPanel from './LeftPanel.jsx';

describe('LeftPanel component test suite', () => {
  it('should render panel layout and container elements', () => {
    const element = LeftPanel({
      incidents: [],
      previousScores: {},
      activeZone: null,
      onZoneSelect: vi.fn(),
      onIncidentFocus: vi.fn(),
      onUpvote: vi.fn(),
      onVerify: vi.fn(),
      onAutoEscalate: vi.fn(),
      onAgentLog: vi.fn(),
    });
    
    expect(element.type).toBe('div');
    expect(element.props.className).toContain('flex flex-col');
    expect(element.props.children).toBeDefined();
  });
});
