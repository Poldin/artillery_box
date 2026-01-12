'use client';

import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';

interface DashboardChangeNotificationProps {
  dashboardName: string;
  onViewDashboard: () => void;
  onDismiss: () => void;
}

export default function DashboardChangeNotification({
  dashboardName,
  onViewDashboard,
  onDismiss,
}: DashboardChangeNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss dopo 6 secondi
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Attendi l'animazione prima di rimuovere
    }, 6000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 animate-slide-up"
      style={{
        maxWidth: '400px',
      }}
    >
      <div 
        className="rounded-lg p-4 shadow-2xl"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="absolute top-2 right-2 p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={14} />
        </button>

        {/* Content */}
        <div className="mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            <strong>{dashboardName}</strong> has changed
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            AI added new widgets to this dashboard
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsVisible(false);
              onViewDashboard();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Eye size={14} />
            Have a look
          </button>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
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
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}
