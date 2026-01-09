'use client';

interface QueryWidgetProps {
  title: string;
  query: string;
  description?: string;
}

export default function QueryWidget({ title, query, description }: QueryWidgetProps) {
  return (
    <div 
      className="rounded-xl p-4 h-full"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <h3 
        className="text-sm font-medium mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p 
          className="text-xs mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          {description}
        </p>
      )}
      <div 
        className="rounded-lg p-3 font-mono text-xs overflow-auto"
        style={{ 
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <pre className="whitespace-pre-wrap">{query}</pre>
      </div>
    </div>
  );
}
