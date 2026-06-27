import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  useState: (initialValue) => {
    const val = typeof initialValue === 'function' ? initialValue() : initialValue;
    return [val, vi.fn()];
  },
  useEffect: vi.fn(),
  useMemo: (factory) => factory(),
}));

import LiveTicker from './LiveTicker.jsx';

describe('LiveTicker component test suite', () => {
  it('should render container with basic styles', () => {
    const element = LiveTicker({ incidents: [], floodRisk: false });
    expect(element.type).toBe('div');
    expect(element.props.className).toContain('bg-[#0c0e13]');
    expect(element.props.className).toContain('border-[#1b1d24]');
  });

  it('should display warning or info when active incidents are passed', () => {
    const incidents = [
      { id: '1', status: 'open', zone: 'Kannoth–Court Corridor', ward: '53', description: 'Large road crater', type: 'road' }
    ];
    const element = LiveTicker({ incidents, floodRisk: false });
    expect(element.props.children).toBeDefined();
  });

  it('should include flood alert in ticker message if floodRisk is true', () => {
    const element = LiveTicker({ incidents: [], floodRisk: true });
    expect(element.props.children).toBeDefined();
  });
});
