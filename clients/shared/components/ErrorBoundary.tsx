import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-lg border border-slate-100 p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Đã có lỗi xảy ra</h1>
            <p className="text-slate-500 mb-8">
              Hệ thống vừa gặp sự cố không mong muốn. Đội ngũ kỹ thuật đã được thông báo.
            </p>
            
            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="bg-slate-50 rounded-xl p-4 text-left overflow-auto mb-8 border border-slate-200">
                <p className="text-red-600 font-mono text-sm font-bold mb-2">{this.state.error.toString()}</p>
                <pre className="text-xs text-slate-500 whitespace-pre-wrap">{this.state.error.stack}</pre>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
