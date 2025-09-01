import '@testing-library/jest-dom';

// Mock UUID for consistent testing
const mockUuid = () => 'test-uuid-' + Math.random().toString(36).substr(2, 9);

// Global mock for uuid
global.jest = {
  mock: (module: string, factory: () => any) => {
    if (module === 'uuid') {
      return factory();
    }
  }
} as any;