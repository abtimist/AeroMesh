import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MapErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center bg-slate-900 text-slate-100">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 max-w-md space-y-3 shadow-2xl">
            <div className="flex justify-center text-amber-400">
              <AlertTriangle size={36} />
            </div>
            <h2 className="text-base font-bold">Map Visualization Notice</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'A map rendering issue occurred. Click below to reload the clean viewport.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <RefreshCw size={14} />
              Reset & Reload Map
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
