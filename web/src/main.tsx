import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { EmbedApp } from './embed/EmbedApp';
import { LangProvider } from './i18n/useLang';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element is missing from index.html');

/**
 * Two surfaces, one bundle:
 *   /embed → compact widget UI (rendered inside an iframe by widget.js)
 *   /      → full standalone console
 */
const isEmbedRoute = window.location.pathname.startsWith('/embed');

document.documentElement.dataset.surface = isEmbedRoute ? 'embed' : 'app';

createRoot(container).render(
  <StrictMode>
    <LangProvider>{isEmbedRoute ? <EmbedApp /> : <App />}</LangProvider>
  </StrictMode>,
);
