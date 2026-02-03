import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const isExtensionPage = window.location.protocol === 'chrome-extension:';
const simulatePopup = new URLSearchParams(window.location.search).get('popup') === '1';

if (isExtensionPage || simulatePopup) {
  document.body.classList.add('popup');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
