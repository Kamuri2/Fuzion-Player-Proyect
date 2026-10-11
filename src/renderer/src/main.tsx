import './assets/main.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'

// Prevenir zoom con Ctrl + rueda del ratón
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

// Prevenir atajos de zoom, F12 y DevTools
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (['+', '=', '-', '_', '0'].includes(e.key)) {
      e.preventDefault();
    }
    if ((e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) || e.key.toLowerCase() === 'u') {
      e.preventDefault();
    }
  }
  if (e.key === 'F12') {
    e.preventDefault();
  }
});

// Prevenir menú contextual del navegador (Inspeccionar elemento)
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Prevenir arrastre de imágenes
window.addEventListener('dragstart', (e) => {
  if (e.target instanceof HTMLImageElement || (e.target as HTMLElement)?.tagName === 'IMG') {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
