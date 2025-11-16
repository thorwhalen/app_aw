/**
 * Data upload component with drag & drop support
 */

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText } from 'lucide-react'
import api from '../services/api'
import { useToast } from './Toast'

export function DataUpload() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading'>('idle')
  const queryClient = useQueryClient()
  const toast = useToast()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadData(file),
    onSuccess: (data) => {
      setUploadStatus('idle')
      toast.success(`Successfully uploaded ${data.filename}`)
      queryClient.invalidateQueries({ queryKey: ['dataArtifacts'] })
    },
    onError: (error: any) => {
      console.error('Upload error:', error)
      setUploadStatus('idle')
      toast.error(error.response?.data?.detail || 'Failed to upload file. Please try again.')
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadStatus('uploading')
      uploadMutation.mutate(acceptedFiles[0])
    }
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
    },
  })

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
        Upload Data
      </h3>

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer',
          backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
          transition: 'all 0.2s',
          opacity: uploadStatus === 'uploading' ? 0.6 : 1,
        }}
      >
        <input {...getInputProps()} disabled={uploadStatus === 'uploading'} />

        {uploadStatus === 'uploading' ? (
          <>
            <FileText size={48} style={{ margin: '0 auto 1rem', color: 'var(--primary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <p style={{ fontWeight: '500' }}>Uploading...</p>
          </>
        ) : (
          <>
            <Upload
              size={48}
              style={{ margin: '0 auto 1rem', color: 'var(--secondary)' }}
            />
            <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              or click to browse
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Supported: CSV, JSON, TXT
            </p>
          </>
        )}
      </div>
    </div>
  )
}
