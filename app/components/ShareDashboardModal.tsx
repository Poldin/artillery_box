'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Loader2 } from 'lucide-react';

interface ShareDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardName: string;
}

export default function ShareDashboardModal({
  isOpen,
  onClose,
  dashboardId,
  dashboardName,
}: ShareDashboardModalProps) {
  const [isShared, setIsShared] = useState(false);
  const [sharingUid, setSharingUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Carica lo stato di condivisione corrente
  useEffect(() => {
    if (isOpen && dashboardId) {
      fetchSharingStatus();
    }
  }, [isOpen, dashboardId]);

  const fetchSharingStatus = async () => {
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/share`);
      if (response.ok) {
        const data = await response.json();
        setIsShared(data.is_shared);
        setSharingUid(data.sharing_uid);
      }
    } catch (error) {
      console.error('Failed to fetch sharing status:', error);
    }
  };

  const toggleSharing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared: !isShared }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsShared(data.is_shared);
        setSharingUid(data.sharing_uid);
      }
    } catch (error) {
      console.error('Failed to toggle sharing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getShareLink = () => {
    if (!sharingUid) return '';
    return `${window.location.origin}/dashare/${sharingUid}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-lg p-6"
        style={{ 
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 
              size={20} 
              style={{ color: 'var(--accent-primary)' }}
            />
            <h3 
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Share Dashboard
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Dashboard Name */}
        <p 
          className="text-sm mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          {dashboardName}
        </p>

        {/* Toggle Switch */}
        <div 
          className="flex items-center justify-between p-3 rounded-lg mb-4"
          style={{ 
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <p 
              className="text-sm font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Public sharing
            </p>
            <p 
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Anyone with the link can view this dashboard
            </p>
          </div>
          <button
            onClick={toggleSharing}
            disabled={isLoading}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ 
              background: isShared ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)'
            }}
          >
            {isLoading ? (
              <Loader2 
                size={12} 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin"
                style={{ color: 'white' }}
              />
            ) : (
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{
                  transform: isShared ? 'translateX(22px)' : 'translateX(2px)'
                }}
              />
            )}
          </button>
        </div>

        {/* Share Link */}
        {isShared && sharingUid && (
          <div>
            <label 
              className="text-xs font-medium mb-2 block"
              style={{ color: 'var(--text-secondary)' }}
            >
              Share link
            </label>
            <div 
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <input
                type="text"
                value={getShareLink()}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                onClick={copyToClipboard}
                className="p-1.5 rounded transition-colors"
                style={{
                  background: isCopied ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)',
                  color: isCopied ? '#22c55e' : 'var(--text-muted)'
                }}
                onMouseEnter={(e) => {
                  if (!isCopied) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCopied) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Warning quando non è condivisa */}
        {!isShared && (
          <div 
            className="p-3 rounded-lg text-xs"
            style={{ 
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#eab308'
            }}
          >
            Enable public sharing to generate a shareable link
          </div>
        )}
      </div>
    </>
  );
}
