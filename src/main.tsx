import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/noto-serif-sc';
import App from './App';
import './i18n';
import './tailwind.css';
import DocumentLocale from './components/DocumentLocale';
import './styles.css';
import './responsive.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DocumentLocale />
    <App />
  </React.StrictMode>,
);
