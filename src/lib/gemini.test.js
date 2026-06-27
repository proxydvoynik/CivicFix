import { describe, it, expect, vi } from 'vitest';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              isValid: true,
              severity: 'warning',
              description: 'Mocked pothole issue description.',
              letterDraft: 'Dear Commissioner, Mocked letter content.',
            }),
          }),
        },
      };
    }),
  };
});

describe('Gemini vision utility test suite', () => {
  it('should export analyzeIssueImage and check configuration status', async () => {
    const { analyzeIssueImage, isGeminiConfigured } = await import('./gemini.js');
    expect(typeof isGeminiConfigured).toBe('boolean');
    
    if (isGeminiConfigured) {
      const result = await analyzeIssueImage('base64String', 'image/png', 'Pothole', 'Court Road', 'Court Corridor');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.severity).toBe('warning');
    }
  });
});
