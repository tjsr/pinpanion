import { render, screen } from '@testing-library/react';

import App from './App';
import React from 'react';

test.skip('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Pin list/i);
  expect(linkElement).toBeInTheDocument();
});
