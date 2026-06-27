import { describe, it, expect, vi } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn().mockReturnValue({
    render: vi.fn(),
  }),
}));

describe('Main entry point test suite', () => {
  it('should find root element and render App', async () => {
    if (typeof global.document === 'undefined') {
      global.document = {
        getElementById: vi.fn().mockReturnValue({}),
      };
    } else {
      vi.spyOn(document, 'getElementById').mockReturnValue({});
    }

    const spy = vi.spyOn(document, 'getElementById');
    await import('./main.jsx');
    
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('root');
    expect(document.getElementById('root')).toBeDefined();
  });
});
