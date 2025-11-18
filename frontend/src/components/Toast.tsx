/**
 * Toast notification system
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: Toast = { id, type, message, duration }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const success = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration)
  }, [showToast])

  const error = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration)
  }, [showToast])

  const warning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration)
  }, [showToast])

  const info = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration)
  }, [showToast])

  const value = {
    showToast,
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '400px',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { type, message } = toast

  const styles = {
    success: {
      bg: '#d1fae5',
      border: '#6ee7b7',
      text: '#065f46',
      icon: <CheckCircle size={20} />,
    },
    error: {
      bg: '#fee2e2',
      border: '#fca5a5',
      text: '#991b1b',
      icon: <XCircle size={20} />,
    },
    warning: {
      bg: '#fef3c7',
      border: '#fcd34d',
      text: '#92400e',
      icon: <AlertCircle size={20} />,
    },
    info: {
      bg: '#dbeafe',
      border: '#93c5fd',
      text: '#1e40af',
      icon: <Info size={20} />,
    },
  }

  const style = styles[type]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '6px',
        color: style.text,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <div style={{ flexShrink: 0 }}>{style.icon}</div>
      <p style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>{message}</p>
      <button
        onClick={onClose}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          color: style.text,
          opacity: 0.6,
          transition: 'opacity 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseOut={(e) => (e.currentTarget.style.opacity = '0.6')}
      >
        <X size={16} />
      </button>
    </div>
  )
}
