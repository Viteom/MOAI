import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Plataforma } from '@/components/moai/portada';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Plataforma />
  </StrictMode>,
);
