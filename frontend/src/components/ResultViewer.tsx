/**
 * Result data viewer with table visualization
 */

import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import api from '../services/api'

interface ResultViewerProps {
  dataId: string
}

export function ResultViewer({ dataId }: ResultViewerProps) {
  const { data: artifact, isLoading: artifactLoading } = useQuery({
    queryKey: ['dataArtifact', dataId],
    queryFn: () => api.getDataArtifact(dataId),
  })

  const { data: sample, isLoading: sampleLoading } = useQuery({
    queryKey: ['dataSample', dataId],
    queryFn: () => api.getDataSample(dataId, 20),
    enabled: !!artifact,
  })

  const handleDownload = async () => {
    if (!artifact) return

    try {
      const blob = await api.downloadData(dataId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = artifact.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    }
  }

  if (artifactLoading) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading result...</p>
      </div>
    )
  }

  if (!artifact) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
          Result not found
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
            Result Data
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {artifact.filename}
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleDownload}>
          <Download size={16} />
          Download
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
          <div>
            <strong>Size:</strong>{' '}
            {artifact.size_bytes
              ? `${(artifact.size_bytes / 1024).toFixed(2)} KB`
              : 'Unknown'}
          </div>
          <div>
            <strong>Type:</strong> {artifact.content_type || 'Unknown'}
          </div>
          <div>
            <strong>Created:</strong>{' '}
            {new Date(artifact.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {sampleLoading && (
        <p style={{ textAlign: 'center', padding: '1rem' }}>Loading preview...</p>
      )}

      {sample && sample.rows && sample.rows.length > 0 && (
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            Data Preview ({sample.sample_size} of {sample.total_rows} rows)
          </h4>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {sample.columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        borderBottom: '2px solid var(--border)',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {sample.columns.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: '0.75rem',
                        }}
                      >
                        {row[col]?.toString() || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sample.total_rows > sample.sample_size && (
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              Showing {sample.sample_size} of {sample.total_rows} rows. Download
              the full file to see all data.
            </p>
          )}
        </div>
      )}

      {!sampleLoading && (!sample || !sample.rows || sample.rows.length === 0) && (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '6px',
          }}
        >
          <FileText size={48} style={{ margin: '0 auto 1rem', color: 'var(--secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            Preview not available. Download the file to view its contents.
          </p>
        </div>
      )}
    </div>
  )
}
