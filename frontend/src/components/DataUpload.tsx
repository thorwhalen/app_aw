/**
 * Data upload component with drag & drop support
 */

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react'
import api from '../services/api'

export function DataUpload() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadData(file),
    onSuccess: (data) => {
      setUploadStatus('success')
      setUploadedFile(data.filename)
      queryClient.invalidateQueries({ queryKey: ['dataArtifacts'] })

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadedFile(null)
      }, 3000)
    },
    onError: (error) => {
      console.error('Upload error:', error)
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 3000)
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
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input {...getInputProps()} />

        {uploadStatus === 'idle' && (
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

        {uploadStatus === 'uploading' && (
          <>
            <FileText size={48} style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
            <p style={{ fontWeight: '500' }}>Uploading...</p>
          </>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--success)' }} />
            <p style={{ fontWeight: '500', color: 'var(--success)' }}>Upload successful!</p>
            {uploadedFile && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {uploadedFile}
              </p>
            )}
          </>
        )}

        {uploadStatus === 'error' && (
          <>
            <XCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--error)' }} />
            <p style={{ fontWeight: '500', color: 'var(--error)' }}>Upload failed</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Please try again
            </p>
          </>
        )}
      </div>
    </div>
  )
}
