/**
 * Data artifacts list component
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Trash2, FileText } from 'lucide-react'
import api from '../services/api'
import { ListSkeleton } from './Loading'
import { EmptyState } from './EmptyState'
import { useToast } from './Toast'

export function DataList() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: artifacts, isLoading, error } = useQuery({
    queryKey: ['dataArtifacts'],
    queryFn: () => api.getDataArtifacts(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDataArtifact(id),
    onSuccess: () => {
      toast.success('File deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['dataArtifacts'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete file')
    },
  })

  const handleDownload = async (id: string, filename: string) => {
    try {
      const blob = await api.downloadData(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Downloaded ${filename}`)
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.response?.data?.detail || 'Failed to download file')
    }
  }

  const handleDelete = async (id: string, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return <ListSkeleton count={3} />
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          icon={<FileText size={48} style={{ color: 'var(--error)' }} />}
          title="Failed to load data"
          description={(error as any).response?.data?.detail || 'An error occurred while loading your data files. Please try again.'}
        />
      </div>
    )
  }

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<FileText size={48} />}
          title="No data uploaded yet"
          description="Upload your first dataset using the form above to get started. Supported formats: CSV, JSON, and TXT."
        />
      </div>
    )
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
        Uploaded Files ({artifacts.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {artifacts.map((artifact) => (
          <div
            key={artifact.id}
            style={{
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <FileText size={24} style={{ color: 'var(--primary)' }} />
              <div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.9375rem' }}>
                  {artifact.filename}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {formatFileSize(artifact.size_bytes)}
                  {' • '}
                  {new Date(artifact.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleDownload(artifact.id, artifact.filename)}
                style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
              >
                <Download size={14} />
                Download
              </button>

              <button
                className="btn btn-danger"
                onClick={() => handleDelete(artifact.id, artifact.filename)}
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
