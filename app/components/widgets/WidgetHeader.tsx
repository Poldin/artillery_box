'use client';

import { Trash2, RefreshCw, AlertCircle, Zap } from 'lucide-react';

interface WidgetHeaderProps {
  title: string;
  updatedAt?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
  isDynamic?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  fetchError?: string;
}

export default function WidgetHeader({ 
  title, 
  updatedAt, 
  onDelete, 
  isDeleting, 
  readOnly = false,
  isDynamic = false,
  onRefresh,
  isRefreshing = false,
  fetchError
}: WidgetHeaderProps) {
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
    <>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          
          {/* Dynamic indicator (lightning icon) */}
          {isDynamic && (
            <div 
              className="flex items-center"
              title="Dynamic data"
            >
              <Zap 
                size={12} 
                style={{ color: '#fbbf24' }}
                fill="#fbbf24"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Error indicator */}
          {fetchError && (
            <div 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444'
              }}
              title={fetchError}
            >
              <AlertCircle size={12} />
              <span className="text-xs">Error</span>
            </div>
          )}
          
          {/* Timestamp */}
          {updatedAt && (
            <span 
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {formatDate(updatedAt)}
            </span>
          )}
          
          {/* Refresh button (only for dynamic widgets) */}
          {isDynamic && onRefresh && !readOnly && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 rounded transition-colors"
              style={{ 
                color: isRefreshing ? 'var(--text-muted)' : 'var(--text-tertiary)',
                cursor: isRefreshing ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isRefreshing) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRefreshing) {
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              title="Refresh data"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
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
      
      {/* Full error message */}
      {fetchError && (
        <div 
          className="mb-3 p-2 rounded text-xs"
          style={{ 
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444'
          }}
        >
          {fetchError}
        </div>
      )}
    </>
  );
}
