export default function TermsPage() {
  return (
    <div 
      className="min-h-screen p-8"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="max-w-3xl mx-auto">
        <h1 
          className="text-2xl font-bold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Terms of Service
        </h1>
        <div 
          className="prose prose-invert"
          style={{ color: 'var(--text-secondary)' }}
        >
          <p>
            Terms of Service content will be added here.
          </p>
        </div>
      </div>
    </div>
  );
}
