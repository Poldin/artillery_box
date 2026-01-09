'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  dashboardToEdit?: { id: string; name: string; description?: string; widgets: unknown[] } | null;
}

export default function CreateDashboardModal({ isOpen, onClose, onCreated, dashboardToEdit }: CreateDashboardModalProps) {
  const isEditMode = !!dashboardToEdit;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (dashboardToEdit && isOpen) {
      setName(dashboardToEdit.name);
      setDescription(dashboardToEdit.description || '');
    }
  }, [dashboardToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const url = isEditMode ? `/api/dashboards/${dashboardToEdit!.id}` : '/api/dashboards';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          ...(isEditMode ? {} : { widgets: [] }),
        }),
      });

      if (response.ok) {
        setName('');
        setDescription('');
        onCreated();
        onClose();
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
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
          <div>
            <h2 
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {isEditMode ? 'edit dashboard' : 'create new dashboard'}
            </h2>
            <p 
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isEditMode ? 'update name and description' : 'give your dashboard a name and description'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            disabled={isCreating}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              if (!isCreating) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label 
              className="block text-sm mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sales Q1 2025"
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label 
              className="block text-sm mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of Q1 sales metrics and KPIs"
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none"
              style={{ 
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            />
            <p 
              className="text-xs mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {description.length}/200 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ 
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)'
              }}
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: name.trim() && !isCreating ? 'var(--text-primary)' : 'var(--text-muted)',
                border: name.trim() && !isCreating ? '1px solid var(--border-default)' : '1px solid var(--border-subtle)',
                cursor: name.trim() && !isCreating ? 'pointer' : 'not-allowed',
                opacity: isCreating ? 0.7 : 1
              }}
              >
                {isCreating && <Loader2 size={16} className="animate-spin" />}
                {isCreating 
                  ? (isEditMode ? 'saving...' : 'creating...') 
                  : (isEditMode ? 'save changes' : 'create dashboard')
                }
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
