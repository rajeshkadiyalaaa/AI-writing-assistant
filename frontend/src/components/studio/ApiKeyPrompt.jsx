import React from 'react';
import { Key, AlertTriangle } from 'lucide-react';

export default function ApiKeyPrompt({ onOpenModal }) {
  return React.createElement(
    'section',
    { className: 'mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800' },
    React.createElement(
      'p',
      { className: 'flex items-start gap-2 text-sm' },
      React.createElement(AlertTriangle, { size: 18, className: 'shrink-0' }),
      'Connect your OpenRouter API key to use Custom models'
    ),
    React.createElement(
      'button',
      { type: 'button', onClick: onOpenModal, className: 'mt-3 inline-flex items-center gap-1 rounded bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600' },
      React.createElement(Key, { size: 14 }),
      ' Connect API key'
    )
  );
}
