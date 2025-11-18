/**
 * Approval modal for human-in-loop workflows
 */

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface ApprovalModalProps {
  isOpen: boolean
  jobId: string
  stepName: string
  intermediateResult: any
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

export function ApprovalModal({
  isOpen,
  jobId,
  stepName,
  intermediateResult,
  onApprove,
  onReject,
  onClose,
}: ApprovalModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleApprove = async () => {
    setLoading(true)
    try {
      await onApprove()
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      await onReject()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>
          Approval Required
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Job ID:</strong> <code>{jobId}</code>
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Step:</strong> {stepName}
          </p>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            maxHeight: '300px',
            overflow: 'auto',
          }}
        >
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
            Intermediate Result
          </h3>
          <pre
            style={{
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {typeof intermediateResult === 'string'
              ? intermediateResult
              : JSON.stringify(intermediateResult, null, 2)}
          </pre>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '6px',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
            <strong>⚠️ Review the intermediate result above.</strong>
            <br />
            Approve to continue the workflow or reject to cancel execution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-danger"
            onClick={handleReject}
            disabled={loading}
          >
            <XCircle size={16} />
            {loading ? 'Processing...' : 'Reject'}
          </button>

          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={loading}
            style={{ backgroundColor: 'var(--success)' }}
          >
            <CheckCircle size={16} />
            {loading ? 'Processing...' : 'Approve & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
