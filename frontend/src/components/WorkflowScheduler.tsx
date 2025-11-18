/**
 * Workflow scheduling component with cron support
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Clock, Power, Calendar } from 'lucide-react'
import api from '../services/api'
import { useToast } from './Toast'
import { EmptyState } from './EmptyState'
import { ListSkeleton } from './Loading'

interface Schedule {
  id: string
  workflow_id: string
  cron_expression: string
  is_active: boolean
  last_run?: string
  next_run?: string
  created_at: string
}

interface ScheduleFormProps {
  workflows: any[]
  onClose: () => void
}

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *', description: 'At minute 0 of every hour' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'At 00:00 every day' },
  { label: 'Every day at 9 AM', value: '0 9 * * *', description: 'At 09:00 every day' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'At 09:00 on Monday' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Every 15 minutes' },
  { label: 'Every week on Sunday', value: '0 0 * * 0', description: 'At 00:00 on Sunday' },
]

function ScheduleForm({ workflows, onClose }: ScheduleFormProps) {
  const [workflowId, setWorkflowId] = useState('')
  const [cronExpression, setCronExpression] = useState('')
  const [usePreset, setUsePreset] = useState(true)
  const queryClient = useQueryClient()
  const toast = useToast()

  const createScheduleMutation = useMutation({
    mutationFn: (data: { workflow_id: string; cron_expression: string }) =>
      // For now, this is a placeholder - you'd implement the actual API endpoint
      Promise.resolve({ id: Math.random().toString(), ...data, is_active: true, created_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Schedule created successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create schedule')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workflowId || !cronExpression) {
      toast.error('Please fill in all fields')
      return
    }
    createScheduleMutation.mutate({ workflow_id: workflowId, cron_expression: cronExpression })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="card" style={{ maxWidth: '600px', margin: '1rem', width: '100%' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          Create Schedule
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Workflow *
            </label>
            <select
              className="input"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              required
            >
              <option value="">Select a workflow...</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className={usePreset ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setUsePreset(true)}
                style={{ flex: 1 }}
              >
                Use Preset
              </button>
              <button
                type="button"
                className={!usePreset ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setUsePreset(false)}
                style={{ flex: 1 }}
              >
                Custom Cron
              </button>
            </div>

            {usePreset ? (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Schedule *
                </label>
                <select
                  className="input"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  required
                >
                  <option value="">Select a schedule...</option>
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} - {preset.description}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cron Expression *
                </label>
                <input
                  type="text"
                  className="input"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 9 * * 1-5"
                  required
                  style={{ fontFamily: 'monospace' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Format: minute hour day month weekday (e.g., "0 9 * * 1-5" = weekdays at 9 AM)
                </p>
              </div>
            )}
          </div>

          {cronExpression && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '6px',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                Selected: <code style={{ fontFamily: 'monospace' }}>{cronExpression}</code>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {CRON_PRESETS.find((p) => p.value === cronExpression)?.description || 'Custom schedule'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createScheduleMutation.isPending}
              style={{ flex: 1 }}
            >
              {createScheduleMutation.isPending ? 'Creating...' : 'Create Schedule'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function WorkflowScheduler() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.getWorkflows(),
  })

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      // Placeholder - would fetch from API
      return [] as Schedule[]
    },
  })

  const toggleScheduleMutation = useMutation({
    mutationFn: (_scheduleId: string) =>
      // Placeholder - would toggle via API
      Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Schedule updated')
    },
    onError: () => {
      toast.error('Failed to update schedule')
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: (_scheduleId: string) =>
      // Placeholder - would delete via API
      Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Schedule deleted')
    },
    onError: () => {
      toast.error('Failed to delete schedule')
    },
  })

  if (isLoading) {
    return <ListSkeleton count={3} />
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              Scheduled Workflows
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Automate workflow execution with cron schedules
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            New Schedule
          </button>
        </div>

        {!schedules || schedules.length === 0 ? (
          <EmptyState
            icon={<Calendar size={48} />}
            title="No schedules yet"
            description="Create your first schedule to automate workflow execution. Use cron expressions to define when workflows should run."
            action={{
              label: 'Create Schedule',
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: schedule.is_active ? 'var(--success)' : 'var(--text-secondary)',
                        }}
                      />
                      <h4 style={{ fontWeight: '600', fontSize: '1rem' }}>
                        Workflow: {schedule.workflow_id.substring(0, 8)}...
                      </h4>
                    </div>

                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.5rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      <Clock size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                      {schedule.cron_expression}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {schedule.last_run && `Last run: ${new Date(schedule.last_run).toLocaleString()}`}
                      {schedule.next_run && ` • Next run: ${new Date(schedule.next_run).toLocaleString()}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleScheduleMutation.mutate(schedule.id)}
                      style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                      title={schedule.is_active ? 'Disable' : 'Enable'}
                    >
                      <Power size={14} style={{ color: schedule.is_active ? 'var(--success)' : 'var(--text-secondary)' }} />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this schedule?')) {
                          deleteScheduleMutation.mutate(schedule.id)
                        }
                      }}
                      style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && workflows && (
        <ScheduleForm workflows={workflows} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
