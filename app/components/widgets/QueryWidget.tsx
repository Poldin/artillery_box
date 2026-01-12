'use client';

import WidgetHeader from './WidgetHeader';

interface QueryWidgetProps {
  title: string;
  query: string;
  description?: string;
  updatedAt?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
}

export default function QueryWidget({ title, query, description, updatedAt, onDelete, isDeleting, readOnly = false }: QueryWidgetProps) {
  return (
    <div 
      className="rounded-xl p-4 h-full"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <WidgetHeader 
        title={title}
        updatedAt={updatedAt}
        onDelete={onDelete}
        isDeleting={isDeleting}
        readOnly={readOnly}
      />
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
