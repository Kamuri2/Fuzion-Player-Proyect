import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-red-900 p-8 text-white select-text overflow-auto">
          <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-lg font-mono mb-4 text-red-200">{this.state.error && this.state.error.toString()}</p>
          <pre className="text-xs font-mono bg-black/50 p-4 rounded-lg text-left whitespace-pre-wrap max-w-full">
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            className="mt-6 px-6 py-2 bg-white text-red-900 font-bold rounded-full"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
