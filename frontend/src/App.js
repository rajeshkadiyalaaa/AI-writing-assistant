import React from 'react';
import AIWritingAssistant from './components/AIWritingAssistant';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AIWritingAssistant />
    </ErrorBoundary>
  );
}

export default App; 