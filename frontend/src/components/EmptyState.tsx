/**
 * Empty state components for better UX
 */

import { FileUp, Workflow, Inbox, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: action ? '1.5rem' : 0, maxWidth: '400px' }}>
        {description}
      </p>
      {action && (
        <button onClick={action.onClick} className="btn btn-primary">
          {action.label}
        </button>
      )}
    </div>
  )
}

export function NoDataUploaded({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      icon={<FileUp size={48} />}
      title="No data uploaded yet"
      description="Upload your first dataset to get started. Supported formats: CSV, JSON, and more."
      action={{
        label: 'Upload Data',
        onClick: onUpload,
      }}
    />
  )
}

export function NoWorkflows({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Workflow size={48} />}
      title="No workflows created yet"
      description="Create your first workflow to automate data processing. Add steps like loading, preparing, and validation."
      action={{
        label: 'Create Workflow',
        onClick: onCreate,
      }}
    />
  )
}

export function NoJobs() {
  return (
    <EmptyState
      icon={<Inbox size={48} />}
      title="No jobs yet"
      description="Execute a workflow to see job history here. Jobs track the execution progress and results."
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again later.',
  onRetry
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={<AlertCircle size={48} style={{ color: 'var(--error)' }} />}
      title={title}
      description={description}
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
      } : undefined}
    />
  )
}
