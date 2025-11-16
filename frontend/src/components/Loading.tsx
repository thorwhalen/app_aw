/**
 * Loading skeleton components
 */

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div
        style={{
          height: '1.5rem',
          width: '60%',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          marginBottom: '1rem',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '1rem',
          width: '100%',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          marginBottom: '0.5rem',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '1rem',
          width: '80%',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="card">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} style={{ padding: '0.75rem', textAlign: 'left' }}>
                <div
                  style={{
                    height: '1rem',
                    width: '80%',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} style={{ padding: '0.75rem' }}>
                  <div
                    style={{
                      height: '1rem',
                      width: '90%',
                      background: 'var(--bg-secondary)',
                      borderRadius: '4px',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '3px solid var(--bg-secondary)',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '3rem',
      }}
    >
      <Spinner size={40} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{message}</p>
    </div>
  )
}
