/**
 * Job history view with filtering and sorting
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import api from '../services/api'
import { ListSkeleton } from './Loading'
import { EmptyState } from './EmptyState'

type SortField = 'created_at' | 'status' | 'progress' | 'duration'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'completed' | 'failed' | 'running' | 'queued' | 'cancelled'

interface JobHistoryProps {
  onViewJob?: (jobId: string) => void
}

export function JobHistory({ onViewJob }: JobHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['allJobs'],
    queryFn: async () => {
      try {
        return await api.getJobs()
      } catch {
        return []
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  })

  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs) return []

    let filtered = jobs

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (job) =>
          job.id.toLowerCase().includes(query) ||
          job.workflow_id?.toLowerCase().includes(query) ||
          job.status.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'progress':
          aValue = a.progress || 0
          bValue = b.progress || 0
          break
        case 'duration':
          aValue =
            a.started_at && a.completed_at
              ? new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()
              : 0
          bValue =
            b.started_at && b.completed_at
              ? new Date(b.completed_at).getTime() - new Date(b.started_at).getTime()
              : 0
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return sorted
  }, [jobs, statusFilter, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'var(--success)'
      case 'failed':
        return 'var(--error)'
      case 'running':
        return 'var(--primary)'
      case 'queued':
        return 'var(--secondary)'
      default:
        return 'var(--text-secondary)'
    }
  }

  const statusCounts = useMemo(() => {
    if (!jobs) return { all: 0, completed: 0, failed: 0, running: 0, queued: 0, cancelled: 0 }

    return {
      all: jobs.length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      running: jobs.filter((j) => j.status === 'running').length,
      queued: jobs.filter((j) => j.status === 'queued').length,
      cancelled: jobs.filter((j) => j.status === 'cancelled').length,
    }
  }, [jobs])

  if (isLoading) {
    return <ListSkeleton count={5} />
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          icon={<Filter size={48} style={{ color: 'var(--error)' }} />}
          title="Failed to load job history"
          description="An error occurred while loading job history. Please try again."
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        {/* Filters and Search */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search by job ID, workflow ID, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['all', 'completed', 'failed', 'running', 'queued', 'cancelled'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                className={statusFilter === status ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setStatusFilter(status)}
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                  ({statusCounts[status]})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Showing {filteredAndSortedJobs.length} of {jobs?.length || 0} jobs
        </div>

        {/* Job Table */}
        {filteredAndSortedJobs.length === 0 ? (
          <EmptyState
            icon={<Filter size={48} />}
            title="No jobs found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('status')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '600',
                      }}
                    >
                      Status
                      {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Job ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Workflow ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('created_at')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '600',
                      }}
                    >
                      Created
                      {sortField === 'created_at' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('duration')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '600',
                      }}
                    >
                      Duration
                      {sortField === 'duration' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                    <button
                      onClick={() => handleSort('progress')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '600',
                      }}
                    >
                      Progress
                      {sortField === 'progress' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedJobs.map((job) => {
                  const duration =
                    job.started_at && job.completed_at
                      ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                      : null

                  return (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: `${getStatusColor(job.status)}15`,
                            color: getStatusColor(job.status),
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                          }}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {job.id.substring(0, 8)}...
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {job.workflow_id ? `${job.workflow_id.substring(0, 8)}...` : 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        {duration ? formatDuration(duration) : 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              flex: 1,
                              minWidth: '60px',
                              height: '6px',
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${job.progress || 0}%`,
                                backgroundColor: getStatusColor(job.status),
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', minWidth: '3rem' }}>{job.progress || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => onViewJob?.(job.id)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
