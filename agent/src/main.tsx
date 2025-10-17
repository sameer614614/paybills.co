import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.js';
import './styles.css';
import { AgentAuthProvider } from './context/AgentAuthProvider.js';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AgentAuthProvider>
        <App />
      </AgentAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
