/**
 * Real-time job execution monitor with WebSocket
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import api from '../services/api'
import { connectToJob } from '../services/websocket'
import { ResultViewer } from './ResultViewer'
import type { Job, JobStatus, WSMessage } from '../types'

interface ExecutionMonitorProps {
  jobId: string
  onComplete?: (job: Job) => void
}

export function ExecutionMonitor({ jobId, onComplete }: ExecutionMonitorProps) {
  const [liveStatus, setLiveStatus] = useState<JobStatus | null>(null)
  const [liveProgress, setLiveProgress] = useState<number>(0)
  const [liveError, setLiveError] = useState<string | null>(null)

  const { data: job, refetch } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId),
    refetchInterval: (data) => {
      // Stop refetching if job is complete or we have WebSocket updates
      if (data?.status && ['completed', 'failed', 'cancelled'].includes(data.status)) {
        return false
      }
      return liveStatus ? false : 5000 // Only poll if no WebSocket
    },
  })

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const socket = connectToJob(
      jobId,
      (message: WSMessage) => {
        if (message.type === 'status') {
          if (message.status) setLiveStatus(message.status)
          if (message.progress !== undefined) setLiveProgress(message.progress)
          if (message.error) setLiveError(message.error)
        } else if (message.type === 'complete') {
          // Job completed, refetch to get final state
          refetch().then((result) => {
            if (result.data && onComplete) {
              onComplete(result.data)
            }
          })
        } else if (message.type === 'error') {
          setLiveError(message.message || 'Unknown error')
        }
      },
      (error) => console.error('WebSocket error:', error),
      () => console.log('WebSocket closed')
    )

    return () => {
      socket.disconnect()
    }
  }, [jobId, refetch, onComplete])

  const currentJob = job || null
  const status = liveStatus || currentJob?.status || 'queued'
  const progress = liveProgress || currentJob?.progress || 0
  const error = liveError || currentJob?.error

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Clock size={20} style={{ color: 'var(--secondary)' }} />
      case 'running':
        return <Activity size={20} style={{ color: 'var(--warning)' }} />
      case 'completed':
        return <CheckCircle size={20} style={{ color: 'var(--success)' }} />
      case 'failed':
        return <XCircle size={20} style={{ color: 'var(--error)' }} />
      case 'cancelled':
        return <AlertCircle size={20} style={{ color: 'var(--secondary)' }} />
      default:
        return <Clock size={20} />
    }
  }

  const getStatusBadge = () => {
    return <span className={`badge badge-${status}`}>{status.toUpperCase()}</span>
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {getStatusIcon()}
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Job Execution</h3>
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <span>Progress</span>
          <span style={{ fontWeight: '600' }}>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentJob && (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p>
            <strong>Job ID:</strong> <code>{jobId}</code>
          </p>
          {currentJob.workflow_id && (
            <p style={{ marginTop: '0.25rem' }}>
              <strong>Workflow ID:</strong> <code>{currentJob.workflow_id}</code>
            </p>
          )}
          <p style={{ marginTop: '0.25rem' }}>
            <strong>Created:</strong> {new Date(currentJob.created_at).toLocaleString()}
          </p>
          {currentJob.started_at && (
            <p style={{ marginTop: '0.25rem' }}>
              <strong>Started:</strong> {new Date(currentJob.started_at).toLocaleString()}
            </p>
          )}
          {currentJob.completed_at && (
            <p style={{ marginTop: '0.25rem' }}>
              <strong>Completed:</strong> {new Date(currentJob.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
          }}
        >
          <p style={{ color: '#991b1b', fontSize: '0.875rem', fontWeight: '500' }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {status === 'completed' && currentJob?.result_data_id && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '6px',
          }}
        >
          <p style={{ color: '#065f46', fontSize: '0.875rem', fontWeight: '500' }}>
            ✓ Job completed successfully
          </p>
        </div>
      )}
    </div>
  )
}

export function ExecutionMonitorWithResults({ jobId, onComplete }: ExecutionMonitorProps) {
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!jobId,
  })

  return (
    <div>
      <ExecutionMonitor jobId={jobId} onComplete={onComplete} />

      {job?.status === 'completed' && job?.result_data_id && (
        <div style={{ marginTop: '1.5rem' }}>
          <ResultViewer dataId={job.result_data_id} />
        </div>
      )}
    </div>
  )
}
