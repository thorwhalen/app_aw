/**
 * Workflow import/export functionality
 */

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileJson } from 'lucide-react'
import api from '../services/api'
import { useToast } from './Toast'
import type { Workflow } from '../types'

interface WorkflowImportExportProps {
  workflow: Workflow
}

export function WorkflowExport({ workflow }: WorkflowImportExportProps) {
  const toast = useToast()

  const handleExport = () => {
    const exportData = {
      name: workflow.name,
      description: workflow.description,
      steps: workflow.steps,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-${workflow.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.success('Workflow exported successfully')
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={handleExport}
      style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
      title="Export workflow as JSON"
    >
      <Download size={14} />
      Export
    </button>
  )
}

export function WorkflowImport() {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const importMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      // Validate the imported data
      if (!workflowData.name || !workflowData.steps || !Array.isArray(workflowData.steps)) {
        throw new Error('Invalid workflow file format')
      }

      // Create workflow from imported data
      return await api.createWorkflow({
        name: `${workflowData.name} (Imported)`,
        description: workflowData.description,
        steps: workflowData.steps,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow imported successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to import workflow')
    },
  })

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file')
      return
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      importMutation.mutate(data)
    } catch (error) {
      toast.error('Invalid JSON file')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
        Import Workflow
      </h3>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <FileJson size={48} style={{ margin: '0 auto 1rem', color: 'var(--secondary)' }} />
        <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
          {isDragging ? 'Drop the file here' : 'Drag & drop a workflow JSON file'}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          or click to browse
        </p>
      </div>
    </div>
  )
}

export function BulkExport({ workflows }: { workflows: Workflow[] }) {
  const toast = useToast()

  const handleExportAll = () => {
    const exportData = {
      workflows: workflows.map((w) => ({
        name: w.name,
        description: w.description,
        steps: w.steps,
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0',
      count: workflows.length,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflows-backup-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.success(`Exported ${workflows.length} workflows`)
  }

  if (workflows.length === 0) {
    return null
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={handleExportAll}
      style={{ fontSize: '0.875rem' }}
    >
      <Download size={16} />
      Export All ({workflows.length})
    </button>
  )
}
