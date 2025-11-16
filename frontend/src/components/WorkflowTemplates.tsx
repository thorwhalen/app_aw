/**
 * Workflow templates component - browse and use pre-built workflows
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Layers } from 'lucide-react'
import api from '../services/api'
import { WORKFLOW_TEMPLATES, TEMPLATE_CATEGORIES, WorkflowTemplate } from '../data/workflowTemplates'
import { useToast } from './Toast'

interface WorkflowTemplatesProps {
  onTemplateUsed?: () => void
}

export function WorkflowTemplates({ onTemplateUsed }: WorkflowTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isExpanded, setIsExpanded] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const createFromTemplateMutation = useMutation({
    mutationFn: (template: WorkflowTemplate) =>
      api.createWorkflow({
        name: template.name,
        description: template.description,
        steps: template.steps,
      }),
    onSuccess: (_data, template) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success(`Created workflow from template: ${template.name}`)
      if (onTemplateUsed) onTemplateUsed()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create workflow from template')
    },
  })

  const filteredTemplates =
    selectedCategory === 'all'
      ? WORKFLOW_TEMPLATES
      : WORKFLOW_TEMPLATES.filter((t) => t.category === selectedCategory)

  if (!isExpanded) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              Workflow Templates
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Start with pre-built workflows ({WORKFLOW_TEMPLATES.length} available)
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setIsExpanded(true)}>
            <Layers size={16} />
            Browse Templates
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Workflow Templates</h3>
        <button
          className="btn btn-secondary"
          onClick={() => setIsExpanded(false)}
          style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
        >
          Collapse
        </button>
      </div>

      {/* Category filters */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {TEMPLATE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={selectedCategory === category.id ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setSelectedCategory(category.id)}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
          >
            {category.label}
            {category.id !== 'all' && (
              <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                ({WORKFLOW_TEMPLATES.filter((t) => t.category === category.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            style={{
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ marginBottom: '0.75rem' }}>
              {template.icon && (
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}>
                  {template.icon}
                </span>
              )}
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>
                {template.name}
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {template.description}
              </p>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {template.steps.map((step, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: 'var(--background)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {step.type}
                  </span>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => createFromTemplateMutation.mutate(template)}
              disabled={createFromTemplateMutation.isPending}
              style={{ marginTop: 'auto', fontSize: '0.875rem', padding: '0.5rem' }}
            >
              <Plus size={14} />
              {createFromTemplateMutation.isPending ? 'Creating...' : 'Use Template'}
            </button>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          No templates found in this category.
        </p>
      )}
    </div>
  )
}
