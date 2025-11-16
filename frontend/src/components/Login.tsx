/**
 * Login component with dev mode quick login
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LoginProps {
  onSwitchToRegister?: () => void
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const { login, devLogin } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDevLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      await devLogin()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Dev login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Login</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="username"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}
          >
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="password"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', marginBottom: '0.75rem' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ position: 'relative', margin: '1rem 0' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: 'var(--border)',
          }}
        />
        <span
          style={{
            position: 'relative',
            display: 'block',
            textAlign: 'center',
            padding: '0 1rem',
            backgroundColor: 'var(--card-bg)',
            width: 'fit-content',
            margin: '0 auto',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          or
        </span>
      </div>

      <button
        onClick={handleDevLogin}
        className="btn btn-secondary"
        disabled={loading}
        style={{ width: '100%', marginBottom: '1rem' }}
      >
        {loading ? 'Logging in...' : '🚀 Quick Dev Login'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Dev mode: Automatically creates/uses <code>dev</code> user
      </p>

      {onSwitchToRegister && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.875rem',
              }}
            >
              Register here
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
