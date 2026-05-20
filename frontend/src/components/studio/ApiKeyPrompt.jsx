import React from 'react';
import { Key, AlertTriangle } from 'lucide-react';

export default function ApiKeyPrompt({ isDarkMode, onOpenModal }) {
  const boxClass = isDarkMode
    ? 'mb-4 rounded-lg border border-yellow-800 bg-yellow-900/30 p-4 text-yellow-200'
    : 'mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800';
  const btnClass = isDarkMode
    ? 'inline-flex items-center gap-1 rounded bg-yellow-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600'
    : 'inline-flex items-center gap-1 rounded bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600';

  return React.createElement(
    'section',
    { className: boxClass },
    React.createElement(
      'p',
      { className: 'flex items-start gap-2 text-sm' },
      React.createElement(AlertTriangle, { size: 18, className: 'shrink-0' }),
      'Connect your OpenRouter API key to use AI suggestions and improvements.'
    ),
    React.createElement(
      'button',
      { type: 'button', onClick: onOpenModal, className: `${btnClass} mt-3` },
      React.createElement(Key, { size: 14 }),
      ' Connect API key'
    )
  );
}
