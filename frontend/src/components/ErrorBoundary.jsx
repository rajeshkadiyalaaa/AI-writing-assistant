import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Catches React render errors so the whole app does not white-screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface-50 p-6 text-center dark:bg-surface-950">
        <div className="studio-panel max-w-md p-8">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
          <h1 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The writing studio hit an unexpected error. You can try again or reload the page.
          </p>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-zinc-100 p-3 text-left text-xs text-red-800 dark:bg-zinc-900 dark:text-red-200">
              {error.message}
            </pre>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={this.handleReset} className="btn-secondary">
              Try again
            </button>
            <button type="button" onClick={this.handleReload} className="btn-primary">
              <RefreshCw size={16} /> Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
