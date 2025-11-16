/**
 * Main App component
 */

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FileUp, Workflow as WorkflowIcon, LayoutDashboard, Activity, LogOut, User } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Register } from './components/Register'
import { DataUpload } from './components/DataUpload'
import { DataList } from './components/DataList'
import { WorkflowBuilder } from './components/WorkflowBuilder'
import { WorkflowList } from './components/WorkflowList'
import { ExecutionMonitorWithResults } from './components/ExecutionMonitor'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

type View = 'dashboard' | 'data' | 'workflows' | 'monitor' | 'login' | 'register'

function MainApp() {
  const { user, logout, isLoading } = useAuth()
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [monitoringJobId, setMonitoringJobId] = useState<string | null>(null)

  const handleExecute = (jobId: string) => {
    setMonitoringJobId(jobId)
    setCurrentView('monitor')
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Show login/register if not authenticated
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        {currentView === 'register' ? (
          <Register onSwitchToLogin={() => setCurrentView('login')} />
        ) : (
          <Login onSwitchToRegister={() => setCurrentView('register')} />
        )}
      </div>
    )
  }

  return (
      <div className="app-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              AW App
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Agentic Workflows
            </p>
          </div>

          <nav>
            <button
              onClick={() => setCurrentView('dashboard')}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: currentView === 'dashboard' ? 'var(--primary)' : 'transparent',
                color: currentView === 'dashboard' ? 'white' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9375rem',
                fontWeight: currentView === 'dashboard' ? '600' : '500',
                transition: 'all 0.2s',
              }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              onClick={() => setCurrentView('data')}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: currentView === 'data' ? 'var(--primary)' : 'transparent',
                color: currentView === 'data' ? 'white' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9375rem',
                fontWeight: currentView === 'data' ? '600' : '500',
                transition: 'all 0.2s',
              }}
            >
              <FileUp size={18} />
              Data Manager
            </button>

            <button
              onClick={() => setCurrentView('workflows')}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: currentView === 'workflows' ? 'var(--primary)' : 'transparent',
                color: currentView === 'workflows' ? 'white' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9375rem',
                fontWeight: currentView === 'workflows' ? '600' : '500',
                transition: 'all 0.2s',
              }}
            >
              <WorkflowIcon size={18} />
              Workflows
            </button>

            {monitoringJobId && (
              <button
                onClick={() => setCurrentView('monitor')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: currentView === 'monitor' ? 'var(--primary)' : 'transparent',
                  color: currentView === 'monitor' ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.9375rem',
                  fontWeight: currentView === 'monitor' ? '600' : '500',
                  transition: 'all 0.2s',
                }}
              >
                <Activity size={18} />
                Monitor Job
              </button>
            )}
          </nav>

          {/* User menu */}
          <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <User size={18} style={{ color: 'var(--text-secondary)' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text)' }}>
                  {user.full_name || user.username}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--error-bg)'
                e.currentTarget.style.color = 'var(--error)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="main-content">
          <div className="header">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              {currentView === 'dashboard' && 'Dashboard'}
              {currentView === 'data' && 'Data Manager'}
              {currentView === 'workflows' && 'Workflows'}
              {currentView === 'monitor' && 'Job Monitor'}
            </h2>
          </div>

          <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            {currentView === 'dashboard' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <DataUpload />
                </div>
                <div>
                  <WorkflowBuilder />
                </div>
              </div>
            )}

            {currentView === 'data' && (
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <DataUpload />
                </div>
                <DataList />
              </div>
            )}

            {currentView === 'workflows' && (
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <WorkflowBuilder />
                </div>
                <WorkflowList onExecute={handleExecute} />
              </div>
            )}

            {currentView === 'monitor' && monitoringJobId && (
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <ExecutionMonitorWithResults
                  jobId={monitoringJobId}
                  onComplete={(job) => {
                    console.log('Job completed:', job)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
