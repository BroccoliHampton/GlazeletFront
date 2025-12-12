import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

// Error fallback for when React can't even mount
function showFatalError(error: Error) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; background: #0a0a0a; color: #fff; padding: 20px; font-family: monospace;">
        <h1 style="color: #ec4899;">⚠️ Failed to Load</h1>
        <p style="color: #888;">Error: ${error.message}</p>
        <pre style="background: #1a1a1a; padding: 15px; border-radius: 8px; overflow: auto; font-size: 11px; color: #ff6b6b;">${error.stack || 'No stack trace'}</pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #ec4899; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
          Reload
        </button>
      </div>
    `
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#fff',
          padding: '20px',
          fontFamily: 'monospace',
        }}>
          <h1 style={{ color: '#ec4899' }}>⚠️ App Crashed</h1>
          <p style={{ color: '#888' }}>Error: {this.state.error?.message}</p>
          <pre style={{
            background: '#1a1a1a',
            padding: '15px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '11px',
            color: '#ff6b6b',
          }}>
            {this.state.error?.stack || 'No stack trace'}
          </pre>
          <button
            onClick={() => location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#ec4899',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Mount the app with error handling
try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
} catch (error) {
  console.error('[Fatal] Failed to mount React:', error)
  showFatalError(error as Error)
}
