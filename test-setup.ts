import '@testing-library/jest-dom';

// Mock UUID for consistent testing
const mockUuid = () => 'test-uuid-' + Math.random().toString(36).substr(2, 9);

// Extend global interface to include jest
declare global {
  var jest: {
    mock: (module: string, factory: () => any) => any;
  };
}

// Global mock for uuid
(globalThis as any).jest = {
  mock: (module: string, factory: () => any) => {
    if (module === 'uuid') {
      return factory();
    }
  }
};