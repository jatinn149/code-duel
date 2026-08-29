import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-950 min-h-screen relative overflow-hidden bg-noise">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-rose/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="card-elevated max-w-md w-full relative z-10 animate-scale-in border-accent-rose/30 glow-danger">
            <div className="flex flex-col items-center p-8">
              <div className="w-20 h-20 rounded-full bg-accent-rose/10 flex items-center justify-center mb-6 animate-glow-pulse">
                <AlertCircle className="w-10 h-10 text-accent-rose" />
              </div>
              
              <h2 className="text-display text-white mb-3 text-gradient-brand">
                SYSTEM FAILURE
              </h2>
              
              <p className="text-body text-surface-400 mb-8 max-w-[280px]">
                {this.state.error?.message || 'An unexpected error occurred in the UI layer.'}
              </p>
              
              <button
                onClick={() => window.location.reload()}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>REBOOT SYSTEM</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
