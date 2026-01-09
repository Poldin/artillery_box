'use client';

import { X, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  latency?: string;
}

interface ConnectionTestDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  result: ConnectionTestResult | null;
  dataSourceName: string;
  onClose: () => void;
  onRetry: () => void;
}

export default function ConnectionTestDialog({
  isOpen,
  isLoading,
  result,
  dataSourceName,
  onClose,
  onRetry,
}: ConnectionTestDialogProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2 
            className="font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Connection Test
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Data source name */}
          <p 
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            Testing connection to <strong style={{ color: 'var(--text-primary)' }}>{dataSourceName}</strong>
          </p>

          {/* Loading state */}
          {isLoading && (
            <div 
              className="flex flex-col items-center justify-center py-8 rounded-xl"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <Loader2 
                size={40} 
                className="animate-spin mb-4" 
                style={{ color: 'var(--text-muted)' }} 
              />
              <p style={{ color: 'var(--text-secondary)' }}>
                Connecting...
              </p>
            </div>
          )}

          {/* Success state */}
          {!isLoading && result?.success && (
            <div 
              className="rounded-xl p-6"
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(34, 197, 94, 0.2)' }}
                >
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                </div>
                <div className="flex-1">
                  <h3 
                    className="font-semibold mb-1"
                    style={{ color: '#22c55e' }}
                  >
                    Connection Successful
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {result.message || 'Successfully connected to the database.'}
                  </p>
                  {result.latency && (
                    <div 
                      className="flex items-center gap-1.5 mt-3 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Clock size={12} />
                      Response time: {result.latency}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {!isLoading && result && !result.success && (
            <div 
              className="rounded-xl p-6"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                >
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                </div>
                <div className="flex-1">
                  <h3 
                    className="font-semibold mb-1"
                    style={{ color: '#ef4444' }}
                  >
                    Connection Failed
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Unable to connect to the database.
                  </p>
                </div>
              </div>

              {/* Error details */}
              {result.error && (
                <div 
                  className="mt-4 p-3 rounded-lg text-xs font-mono overflow-x-auto"
                  style={{ 
                    background: 'var(--bg-primary)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <strong style={{ color: 'var(--text-secondary)' }}>Error:</strong>
                  <br />
                  {result.error}
                </div>
              )}

              {result.latency && (
                <div 
                  className="flex items-center gap-1.5 mt-3 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Clock size={12} />
                  Timeout after: {result.latency}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {!isLoading && result && !result.success && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ 
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
            }}
          >
            {result?.success ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
