/**
 * Dashboard with monitoring and analytics
 */

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, CheckCircle, XCircle, Clock, Play } from 'lucide-react'
import api from '../services/api'
import { CardSkeleton } from './Loading'
import type { Job } from '../types'

interface DashboardStats {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  runningJobs: number
  successRate: number
  avgExecutionTime: number
}

function calculateStats(jobs: Job[]): DashboardStats {
  const totalJobs = jobs.length
  const completedJobs = jobs.filter((j) => j.status === 'completed').length
  const failedJobs = jobs.filter((j) => j.status === 'failed').length
  const runningJobs = jobs.filter((j) => j.status === 'running').length
  const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

  // Calculate average execution time for completed jobs
  const completedWithTime = jobs.filter(
    (j) => j.status === 'completed' && j.started_at && j.completed_at
  )
  const avgExecutionTime =
    completedWithTime.length > 0
      ? completedWithTime.reduce((sum, j) => {
          const start = new Date(j.started_at!).getTime()
          const end = new Date(j.completed_at!).getTime()
          return sum + (end - start)
        }, 0) / completedWithTime.length
      : 0

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    runningJobs,
    successRate,
    avgExecutionTime,
  }
}

function StatCard({
  icon,
  label,
  value,
  color,
  trend,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  trend?: string
}) {
  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: `${color}15`,
            color: color,
            display: 'flex',
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: '700' }}>{value}</div>
        {trend && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {trend}
          </div>
        )}
      </div>
    </div>
  )
}

function SimpleBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '200px' }}>
      {data.map((item, idx) => (
        <div
          key={idx}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            height: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color,
              borderRadius: '4px 4px 0 0',
              minHeight: item.value > 0 ? '20px' : '0',
              transition: 'height 0.3s ease',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}
            >
              {item.value}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentJobsTable({ jobs }: { jobs: Job[] }) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: 'var(--success)' }} />
      case 'failed':
        return <XCircle size={16} style={{ color: 'var(--error)' }} />
      case 'running':
        return <Play size={16} style={{ color: 'var(--primary)' }} />
      default:
        return <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
    }
  }

  const recentJobs = jobs.slice(0, 10)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Workflow</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Started</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Duration</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {recentJobs.map((job) => {
            const duration =
              job.started_at && job.completed_at
                ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                : null

            return (
              <tr
                key={job.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getStatusIcon(job.status)}
                    <span style={{ textTransform: 'capitalize' }}>{job.status}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>{job.workflow_id ? `${job.workflow_id.substring(0, 8)}...` : 'N/A'}</td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  {job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  {duration ? formatDuration(duration) : 'N/A'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        flex: 1,
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
                          backgroundColor:
                            job.status === 'completed'
                              ? 'var(--success)'
                              : job.status === 'failed'
                                ? 'var(--error)'
                                : 'var(--primary)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '3rem' }}>
                      {job.progress || 0}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {recentJobs.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No jobs executed yet
        </div>
      )}
    </div>
  )
}

export function Dashboard() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['allJobs'],
    queryFn: async () => {
      try {
        return await api.getJobs()
      } catch {
        return []
      }
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  const stats = calculateStats(jobs || [])

  const chartData = [
    { label: 'Completed', value: stats.completedJobs, color: 'var(--success)' },
    { label: 'Failed', value: stats.failedJobs, color: 'var(--error)' },
    { label: 'Running', value: stats.runningJobs, color: 'var(--primary)' },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Dashboard</h2>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <StatCard
          icon={<TrendingUp size={24} />}
          label="Total Jobs"
          value={stats.totalJobs}
          color="var(--primary)"
        />
        <StatCard
          icon={<CheckCircle size={24} />}
          label="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          color="var(--success)"
          trend={`${stats.completedJobs} completed`}
        />
        <StatCard
          icon={<XCircle size={24} />}
          label="Failed Jobs"
          value={stats.failedJobs}
          color="var(--error)"
        />
        <StatCard
          icon={<Clock size={24} />}
          label="Avg Duration"
          value={
            stats.avgExecutionTime > 0
              ? `${Math.round(stats.avgExecutionTime / 1000)}s`
              : 'N/A'
          }
          color="var(--secondary)"
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Job Status Distribution
          </h3>
          <SimpleBarChart data={chartData} />
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Quick Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Most Common Status
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                {stats.completedJobs >= stats.failedJobs ? 'Completed ✓' : 'Failed ✗'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Currently Running
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{stats.runningJobs}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Health Status
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: stats.successRate >= 80 ? 'var(--success)' : stats.successRate >= 50 ? 'orange' : 'var(--error)',
                }}
              >
                {stats.successRate >= 80 ? 'Excellent' : stats.successRate >= 50 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Recent Job Executions
        </h3>
        <RecentJobsTable jobs={jobs || []} />
      </div>
    </div>
  )
}
