import React from 'react';

/**
 * Comprehensive React Error Boundary System
 * Catches JavaScript errors in component tree and provides graceful fallbacks
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error details
    console.error('🚨 Error Boundary Caught Error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo, errorId);

    // Log to backend if user is authenticated
    this.logToBackend(error, errorInfo, errorId);
  }

  reportError = (error, errorInfo, errorId) => {
    // Integration point for error monitoring services like Sentry, LogRocket, etc.
    if (window.Sentry && typeof window.Sentry.captureException === 'function') {
      window.Sentry.captureException(error, {
        tags: { errorBoundary: true, errorId },
        extra: { errorInfo }
      });
    }
  };

  logToBackend = async (error, errorInfo, errorId) => {
    try {
      const user = JSON.parse(localStorage.getItem('wecare:user') || '{}');
      
      if (user.token) {
        await fetch('http://localhost:5000/api/errors/client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userId: user.id,
            userRole: user.role
          })
        });
      }
    } catch (logError) {
      console.warn('Failed to log error to backend:', logError.message);
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;
      const { fallback: CustomFallback, level = 'page' } = this.props;

      // Use custom fallback if provided
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error}
            errorId={errorId}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        );
      }

      // Default fallback UI based on error level
      return this.renderDefaultFallback(level);
    }

    return this.props.children;
  }

  renderDefaultFallback = (level) => {
    const { error, errorId } = this.state;
    const isProduction = process.env.NODE_ENV === 'production';

    // Component-level error (minimal impact)
    if (level === 'component') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Component temporarily unavailable
              </p>
            </div>
            <div className="ml-auto">
              <button
                onClick={this.handleRetry}
                className="text-red-700 hover:text-red-900 text-sm underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Section-level error (moderate impact)
    if (level === 'section') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-red-900">Section Error</h3>
            <p className="mt-2 text-sm text-red-700">
              This section encountered an error and cannot be displayed.
            </p>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Page-level error (high impact)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Something went wrong
              </h2>
              
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>

              {!isProduction && error && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-left">
                  <p className="text-xs text-gray-700 font-mono">
                    <strong>Error ID:</strong> {errorId}
                  </p>
                  <p className="text-xs text-gray-700 font-mono mt-1">
                    <strong>Error:</strong> {error.message}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reload Page
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Go to Home Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for error reporting from functional components
export const useErrorReporting = () => {
  const reportError = React.useCallback((error, errorInfo = {}) => {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.error('🚨 Manual Error Report:', {
      errorId,
      error: error.message || error,
      stack: error.stack,
      ...errorInfo,
      timestamp: new Date().toISOString()
    });

    // Log to backend
    const logToBackend = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('wecare:user') || '{}');
        
        if (user.token) {
          await fetch('http://localhost:5000/api/errors/client', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            credentials: 'include',
            body: JSON.stringify({
              errorId,
              message: error.message || String(error),
              stack: error.stack || 'No stack trace',
              ...errorInfo,
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString(),
              userId: user.id,
              userRole: user.role,
              type: 'manual_report'
            })
          });
        }
      } catch (logError) {
        console.warn('Failed to log error to backend:', logError.message);
      }
    };

    logToBackend();
    return errorId;
  }, []);

  return { reportError };
};

export default ErrorBoundary;