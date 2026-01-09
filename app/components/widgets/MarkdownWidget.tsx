'use client';

interface MarkdownWidgetProps {
  title: string;
  content: string;
}

export default function MarkdownWidget({ title, content }: MarkdownWidgetProps) {
  return (
    <div 
      className="rounded-xl p-4 h-full"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <h3 
        className="text-sm font-medium mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <div 
        className="prose prose-sm max-w-none whitespace-pre-wrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        {content}
      </div>
    </div>
  );
}
