export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="space-y-2">
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-soft)', fontWeight: '400', letterSpacing: '0.15em' }}
        >
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1
          style={{
            color: 'var(--text-dark)',
            fontSize: '2.5rem',
            fontWeight: '300',
            letterSpacing: '-0.02em',
          }}
        >
          Overview
        </h1>
      </div>
    </div>
  )
}
