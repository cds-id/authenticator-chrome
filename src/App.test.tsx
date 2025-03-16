import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Chrome API
global.chrome = {
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      callback([{ url: 'https://example.com' }]);
    }),
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn(),
    },
  },
} as any;

test('renders TOTP authenticator', () => {
  render(<App />);
  const headerElement = screen.getByText(/TOTP/i);
  expect(headerElement).toBeInTheDocument();
});
