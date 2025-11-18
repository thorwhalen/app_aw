/**
 * Workflow list component
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Trash2, Workflow as WorkflowIcon } from 'lucide-react'
import api from '../services/api'
import type { Workflow } from '../types'
import { ListSkeleton } from './Loading'
import { EmptyState } from './EmptyState'
import { useToast } from './Toast'
import { WorkflowExport, BulkExport } from './WorkflowImportExport'

interface WorkflowListProps {
  onExecute?: (jobId: string) => void
}

export function WorkflowList({ onExecute }: WorkflowListProps) {
  const [selectedDataId, setSelectedDataId] = useState<string>('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.getWorkflows(),
  })

  const { data: dataArtifacts } = useQuery({
    queryKey: ['dataArtifacts'],
    queryFn: () => api.getDataArtifacts(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkflow(id),
    onSuccess: () => {
      toast.success('Workflow deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete workflow')
    },
  })

  const executeMutation = useMutation({
    mutationFn: ({ workflowId, dataId }: { workflowId: string; dataId?: string }) =>
      api.executeWorkflow(workflowId, dataId),
    onSuccess: (job) => {
      toast.success('Workflow execution started')
      if (onExecute) {
        onExecute(job.id)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to execute workflow')
    },
  })

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete workflow "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleExecute = (workflowId: string) => {
    executeMutation.mutate({
      workflowId,
      dataId: selectedDataId || undefined,
    })
  }

  if (isLoading) {
    return <ListSkeleton count={3} />
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          icon={<WorkflowIcon size={48} style={{ color: 'var(--error)' }} />}
          title="Failed to load workflows"
          description={(error as any).response?.data?.detail || 'An error occurred while loading your workflows. Please try again.'}
        />
      </div>
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<WorkflowIcon size={48} />}
          title="No workflows created yet"
          description="Create your first workflow using the builder above to automate data processing. Add steps like loading, preparing, and validation."
        />
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
          Workflows ({workflows.length})
        </h3>
        <BulkExport workflows={workflows} />
      </div>

      {dataArtifacts && dataArtifacts.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Input Data (optional)
          </label>
          <select
            className="input"
            value={selectedDataId}
            onChange={(e) => setSelectedDataId(e.target.value)}
          >
            <option value="">No input data</option>
            {dataArtifacts.map((artifact) => (
              <option key={artifact.id} value={artifact.id}>
                {artifact.filename} ({(artifact.size_bytes || 0) / 1024} KB)
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {workflows.map((workflow: Workflow) => (
          <div
            key={workflow.id}
            style={{
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{workflow.name}</h4>
              {workflow.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {workflow.description}
                </p>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              <span>{workflow.steps.length} steps</span>
              {' • '}
              <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleExecute(workflow.id)}
                disabled={executeMutation.isPending}
                style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
              >
                <Play size={14} />
                {executeMutation.isPending ? 'Executing...' : 'Execute'}
              </button>

              <WorkflowExport workflow={workflow} />

              <button
                className="btn btn-danger"
                onClick={() => handleDelete(workflow.id, workflow.name)}
                disabled={deleteMutation.isPending}
                style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
