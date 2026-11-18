import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './lib/install'; // start listening for the install prompt as early as possible
import './index.css';
import { startProgressSync } from './lib/progressSync';

startProgressSync(); // push students' progress to their account automatically

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
