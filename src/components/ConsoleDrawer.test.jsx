import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  useState: (initialValue) => {
    const val = typeof initialValue === 'function' ? initialValue() : initialValue;
    return [val, vi.fn()];
  },
  useEffect: vi.fn(),
  useMemo: (factory) => factory(),
}));

import ConsoleDrawer from './ConsoleDrawer.jsx';

describe('ConsoleDrawer component test suite', () => {
  it('should render container div and respect logs length', () => {
    const logs = ['Initial mock log', 'Second mock log'];
    const element = ConsoleDrawer({ logs });
    
    expect(element.type).toBe('div');
    expect(element.props.className).toContain('fixed bottom-0');
    
    const children = element.props.children;
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBe(2); // Header bar + Expanded logs panel
  });

  it('should render empty log placeholder if logs are empty', () => {
    const element = ConsoleDrawer({ logs: [] });
    const children = element.props.children;
    const logsPanel = children[1];
    expect(logsPanel.props.children).toBeDefined();
  });
});
