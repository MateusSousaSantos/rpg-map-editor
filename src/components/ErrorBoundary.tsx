import { Component,  } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { useLanguageStore } from '../stores/languageStore';
import { translate, type TranslationKey } from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Class components can't use hooks; read the current language directly.
      const t = (key: TranslationKey) =>
        translate(useLanguageStore.getState().language, key);
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
          <div className="max-w-2xl w-full mx-4 bg-slate-900 border border-red-500/30 rounded-lg p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-lg">
                <svg 
                  className="w-6 h-6 text-red-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-400">
                  {t('error.title')}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  {t('error.subtitle')}
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-6">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-slate-300 hover:text-slate-200 mb-2">
                    {t('error.details')}
                    <span className="ml-2 text-slate-500 group-open:hidden">▶</span>
                    <span className="ml-2 text-slate-500 hidden group-open:inline">▼</span>
                  </summary>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                    <p className="text-red-400 font-mono text-sm mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-xs text-slate-400 overflow-auto max-h-64 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('error.tryAgain')}
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                {t('error.reloadPage')}
              </button>
            </div>

            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">
                💡 <strong className="text-slate-300">{t('error.tipLabel')}</strong> {t('error.tipText')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
