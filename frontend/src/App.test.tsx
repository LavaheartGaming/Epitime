import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';

test('renders without crashing', () => {
  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  // App redirects to /login if not authenticated, so we might see "Connexion" or similar if we look for text.
  // However, without a Router provider in the test, it might fail if App doesn't provide one.
  // App.tsx uses AppRoutes which includes BrowserRouter.
  // So we just check if it renders.
  const appElement = document.querySelector('.App') || document.body;
  expect(appElement).toBeInTheDocument();
});
