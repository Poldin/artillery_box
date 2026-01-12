'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WidgetHeader from './WidgetHeader';
import { Edit3, Check, X, Trash2, RefreshCw, AlertCircle, Zap } from 'lucide-react';

interface MarkdownWidgetProps {
  title: string;
  content: string;
  updatedAt?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  widgetId: string;
  dashboardId: string;
  onUpdate?: () => void; // Callback per ricaricare la dashboard
  readOnly?: boolean;
  isDynamic?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  fetchError?: string;
}

export default function MarkdownWidget({ 
  title, 
  content, 
  updatedAt, 
  onDelete, 
  isDeleting, 
  widgetId, 
  dashboardId, 
  onUpdate, 
  readOnly = false,
  isDynamic,
  onRefresh,
  isRefreshing,
  fetchError
}: MarkdownWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editedContent]);

  const handleSave = async () => {
    if (editedContent === content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    
    try {
      // Recupera la dashboard corrente
      const response = await fetch(`/api/dashboards/${dashboardId}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      
      const { dashboard } = await response.json();
      const widgets = dashboard.widgets || [];
      
      // Trova e aggiorna il widget
      const updatedWidgets = widgets.map((w: any) => {
        if (w.id === widgetId) {
          return {
            ...w,
            data: {
              ...w.data,
              content: editedContent,
            },
            updated_at: new Date().toISOString(),
          };
        }
        return w;
      });
      
      // Salva
      const updateResponse = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: updatedWidgets }),
      });
      
      if (updateResponse.ok) {
        setIsEditing(false);
        onUpdate?.(); // Ricarica la dashboard
      }
    } catch (error) {
      console.error('[MarkdownWidget] Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <div 
      className="rounded-xl p-4 h-full flex flex-col"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
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
              {new Date(updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </span>
          )}
          
          {/* Refresh button (only for dynamic widgets) */}
          {isDynamic && onRefresh && !readOnly && !isEditing && (
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
          
          {/* Edit button (show when not editing, not read-only, and not dynamic) */}
          {!isEditing && !readOnly && !isDynamic && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-primary)';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Edit content"
            >
              <Edit3 size={14} />
            </button>
          )}
          
          {/* Delete button (only if not read-only and not editing) */}
          {!isEditing && !readOnly && onDelete && (
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
          
          {/* Save/Cancel buttons (show when editing) */}
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1 rounded transition-colors"
                style={{ 
                  color: 'var(--accent-primary)',
                  opacity: isSaving ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Save changes"
              >
                <Check size={14} />
              </button>
              
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="p-1 rounded transition-colors"
                style={{ 
                  color: 'var(--text-muted)',
                  opacity: isSaving ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Cancel editing"
              >
                <X size={14} />
              </button>
            </>
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
      
      {/* Content - editable or rendered */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-3 rounded-lg text-sm font-mono resize-none overflow-hidden"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            outline: 'none',
            minHeight: '100px',
          }}
          placeholder="Enter markdown content..."
        />
      ) : (
        <div className="chat-markdown flex-1 overflow-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
