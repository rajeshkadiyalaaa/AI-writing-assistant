import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tailwind.css';
import App from './App';

document.documentElement.classList.remove('dark');
try {
  localStorage.removeItem('dark_mode');
} catch {
  /* ignore */
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
