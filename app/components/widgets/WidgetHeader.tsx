'use client';

import { Trash2 } from 'lucide-react';

interface WidgetHeaderProps {
  title: string;
  updatedAt?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
}

export default function WidgetHeader({ title, updatedAt, onDelete, isDeleting, readOnly = false }: WidgetHeaderProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="flex items-start justify-between mb-3">
      <h3 
        className="text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      
      <div className="flex items-center gap-2">
        {/* Timestamp */}
        {updatedAt && (
          <span 
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Last: {formatDate(updatedAt)}
          </span>
        )}
        
        {/* Delete button (only if not read-only) */}
        {!readOnly && onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded transition-colors"
            style={{ 
              color: isDeleting ? '#ef4444' : 'var(--text-muted)',
              animation: isDeleting ? 'pulse 0.5s ease-in-out infinite' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
            title={isDeleting ? 'Click again to confirm deletion' : 'Delete widget'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
