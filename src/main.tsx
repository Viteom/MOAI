import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MoaiApp } from '@/components/moai/app';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoaiApp />
  </StrictMode>,
);
