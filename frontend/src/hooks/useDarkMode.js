import { useState, useEffect } from 'react';

export default function useDarkMode(showNotification) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('dark_mode', String(next));
    showNotification?.(`${next ? 'Dark' : 'Light'} mode activated`, 'info');
  };

  return { isDarkMode, toggleDarkMode };
}
