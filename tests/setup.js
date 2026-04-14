import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpeza automática após cada teste
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Silenciar erros esperados do React (ex: boundary errors em testes)
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('Error: Uncaught'))
  ) return;
  originalConsoleError(...args);
};
