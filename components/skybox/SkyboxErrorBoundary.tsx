'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { SkyboxError, SkyboxErrorType } from '../../types/skybox'

interface SkyboxErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface SkyboxErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

/**
 * Error boundary specifically designed for skybox components
 * Following React 18+ error handling patterns
 */
export class SkyboxErrorBoundary extends Component<
  SkyboxErrorBoundaryProps,
  SkyboxErrorBoundaryState
> {
  private resetTimeoutId: number | null = null

  constructor(props: SkyboxErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<SkyboxErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    const errorId = `skybox_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    this.logError(error, errorInfo)

    // Update state with error info
    this.setState({
      errorInfo
    })

    // Call external error handler if provided
    this.props.onError?.(error, errorInfo)

    // Auto-reset after timeout for non-critical errors
    if (this.shouldAutoReset(error)) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary()
      }, 5000) // Auto-reset after 5 seconds
    }
  }

  componentDidUpdate(prevProps: SkyboxErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // Reset error boundary when props change (if enabled)
    if (hasError && resetOnPropsChange && this.hasResetKeyChanged(prevProps.resetKeys, resetKeys)) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private hasResetKeyChanged(
    prevResetKeys: Array<string | number> = [],
    resetKeys: Array<string | number> = []
  ): boolean {
    if (prevResetKeys.length !== resetKeys.length) {
      return true
    }

    return prevResetKeys.some((key, index) => key !== resetKeys[index])
  }

  private shouldAutoReset(error: Error): boolean {
    // Don't auto-reset for critical errors
    if (error instanceof SkyboxError) {
      return ![
        SkyboxErrorType.MEMORY_LIMIT_EXCEEDED,
        SkyboxErrorType.SHADER_COMPILATION_FAILED
      ].includes(error.type)
    }

    // Auto-reset for non-skybox errors (likely rendering issues)
    return true
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }

    console.error('Skybox Error Boundary caught an error:', errorDetails)

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // errorReportingService.report(errorDetails)
    }
  }

  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })

    console.debug('Skybox error boundary reset')
  }

  private getErrorMessage(error: Error): string {
    if (error instanceof SkyboxError) {
      switch (error.type) {
        case SkyboxErrorType.TEXTURE_LOAD_FAILED:
          return 'Failed to load skybox texture. Please check your internet connection and try again.'

        case SkyboxErrorType.MEMORY_LIMIT_EXCEEDED:
          return 'Not enough memory to load skybox. Try closing other applications or reducing quality settings.'

        case SkyboxErrorType.INVALID_PRESET:
          return 'The selected skybox preset is invalid or corrupted.'

        case SkyboxErrorType.TRANSITION_FAILED:
          return 'Skybox transition failed. The display will continue with the current skybox.'

        case SkyboxErrorType.SHADER_COMPILATION_FAILED:
          return 'Graphics driver issue detected. Please update your graphics drivers.'

        case SkyboxErrorType.NETWORK_ERROR:
          return 'Network error while loading skybox. Please check your connection.'

        default:
          return 'An unexpected skybox error occurred.'
      }
    }

    return error.message || 'An unknown error occurred in the skybox system.'
  }

  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' {
    if (error instanceof SkyboxError) {
      switch (error.type) {
        case SkyboxErrorType.MEMORY_LIMIT_EXCEEDED:
        case SkyboxErrorType.SHADER_COMPILATION_FAILED:
          return 'high'

        case SkyboxErrorType.TEXTURE_LOAD_FAILED:
        case SkyboxErrorType.NETWORK_ERROR:
          return 'medium'

        default:
          return 'low'
      }
    }

    return 'medium'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      const { error } = this.state
      const errorMessage = error ? this.getErrorMessage(error) : 'An error occurred'
      const severity = error ? this.getErrorSeverity(error) : 'medium'

      return (
        <div
          className={`skybox-error-boundary ${severity}-severity`}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '2rem',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
              Skybox Error
            </h2>

            <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {errorMessage}
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={this.resetErrorBoundary}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#45a049'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#4CAF50'
                }}
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#da190b'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f44336'
                }}
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                  Error Details (Development)
                </summary>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '1rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}
                >
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook version of the error boundary for functional components
 * Note: This is a simplified version - full error boundaries require class components
 */
export function useSkyboxErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    console.error('Skybox error caught by hook:', error)

    // You could integrate this with an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // errorReportingService.report({ error, errorInfo })
    }
  }, [])

  return { handleError }
}

/**
 * HOC wrapper for easy integration
 */
export function withSkyboxErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<SkyboxErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <SkyboxErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </SkyboxErrorBoundary>
  )

  WrappedComponent.displayName = `withSkyboxErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default SkyboxErrorBoundary
