/**
 * Workflow builder component
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save } from 'lucide-react'
import api from '../services/api'
import type { WorkflowStep, WorkflowStepType } from '../types'
import { useToast } from './Toast'

export function WorkflowBuilder() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const queryClient = useQueryClient()
  const toast = useToast()

  const createMutation = useMutation({
    mutationFn: () =>
      api.createWorkflow({
        name,
        description: description || undefined,
        steps,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow created successfully!')
      // Reset form
      setName('')
      setDescription('')
      setSteps([])
    },
    onError: (error: any) => {
      console.error('Failed to create workflow:', error)
      toast.error(error.response?.data?.detail || 'Failed to create workflow. Please try again.')
    },
  })

  const addStep = (type: WorkflowStepType) => {
    const newStep: WorkflowStep = {
      type,
      config: type === 'preparing' ? { target: 'cosmo-ready' } : {},
      require_approval: false,
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStepConfig = (index: number, key: string, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = {
      ...newSteps[index],
      config: { ...newSteps[index].config, [key]: value },
    }
    setSteps(newSteps)
  }

  const canSave = name.trim() !== '' && steps.length > 0

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
        Create Workflow
      </h3>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
          Workflow Name *
        </label>
        <input
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Data Processing Workflow"
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
          Description
        </label>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
          Workflow Steps *
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => addStep('loading')}>
            <Plus size={16} /> Add Loading Step
          </button>
          <button className="btn btn-secondary" onClick={() => addStep('preparing')}>
            <Plus size={16} /> Add Preparing Step
          </button>
          <button className="btn btn-secondary" onClick={() => addStep('validation')}>
            <Plus size={16} /> Add Validation Step
          </button>
        </div>

        {steps.length === 0 && (
          <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No steps added yet. Click a button above to add a step.
          </p>
        )}

        {steps.map((step, index) => (
          <div
            key={index}
            style={{
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              marginBottom: '0.75rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: '500' }}>
                Step {index + 1}: {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
              </span>
              <button
                className="btn btn-danger"
                onClick={() => removeStep(index)}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>

            {step.type === 'preparing' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '500' }}>
                  Target Format
                </label>
                <input
                  type="text"
                  className="input"
                  value={step.config.target || ''}
                  onChange={(e) => updateStepConfig(index, 'target', e.target.value)}
                  placeholder="cosmo-ready"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
            )}

            {step.type === 'validation' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '500' }}>
                  Validation Type
                </label>
                <select
                  className="input"
                  value={step.config.validation_type || 'schema'}
                  onChange={(e) => updateStepConfig(index, 'validation_type', e.target.value)}
                  style={{ fontSize: '0.875rem' }}
                >
                  <option value="schema">Schema Validation</option>
                  <option value="info_dict">Info Dict Validation</option>
                  <option value="functional">Functional Validation</option>
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary"
        onClick={() => createMutation.mutate()}
        disabled={!canSave || createMutation.isPending}
        style={{ width: '100%' }}
      >
        <Save size={16} />
        {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
      </button>
    </div>
  )
}
