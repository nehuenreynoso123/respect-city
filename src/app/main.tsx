import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';
import { AppProvider } from '@/app/store/AppProvider';

import '@/styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root container missing');

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
