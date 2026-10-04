import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider, ToastProvider } from '@uyovqat/shared';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider role="seller">
          <App />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
