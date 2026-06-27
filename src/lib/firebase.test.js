import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'mock-db' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ type: 'mock-auth' })),
}));

describe('Firebase initialization test suite', () => {
  it('should export firebase variables and status correctly', async () => {
    const { db, auth, isFirebaseConfigured } = await import('./firebase.js');
    expect(typeof isFirebaseConfigured).toBe('boolean');
    if (isFirebaseConfigured) {
      expect(db).toBeDefined();
      expect(auth).toBeDefined();
    } else {
      expect(db).toBeNull();
      expect(auth).toBeNull();
    }
  });
});
