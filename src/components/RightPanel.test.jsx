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

import RightPanel from './RightPanel.jsx';

describe('RightPanel component test suite', () => {
  it('should render panel layout and outer container', () => {
    const element = RightPanel({
      incidents: [],
      wardens: [],
      onAgentLog: vi.fn()
    });
    
    expect(element.type).toBe('div');
    expect(element.props.className).toContain('flex flex-col');
    expect(element.props.children).toBeDefined();
  });
});
