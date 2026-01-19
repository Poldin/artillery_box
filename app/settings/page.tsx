'use client';

import { useState } from 'react';
import TopBar from '../components/TopBar';
import { User, Bot, ChevronRight, Eye, EyeOff, ChevronDown, Check, CheckCircle, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { useAI } from '../lib/ai';
import { useAuth } from '../lib/auth';
import Link from 'next/link';

type SettingsSection = 'profile' | 'ai-connection';

const menuItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'profile', icon: <User size={18} /> },
  { id: 'ai-connection', label: 'AI connection', icon: <Bot size={18} /> },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('ai-connection');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Page Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side Menu */}
        <div 
          className="w-64 shrink-0 border-r overflow-auto"
          style={{ 
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="p-4">
            <h2 
              className="text-sm font-medium mb-4 px-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              settings
            </h2>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                  style={{ 
                    background: activeSection === item.id ? 'var(--bg-hover)' : 'transparent',
                    color: activeSection === item.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== item.id) {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== item.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {item.icon}
                  {item.label}
                  {activeSection === item.id && (
                    <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {activeSection === 'profile' && <ProfileSection />}
            {activeSection === 'ai-connection' && <AIConnectionSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Section
function ProfileSection() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <div className="mb-8">
          <h1 
            className="text-xl font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            profile
          </h1>
        </div>
        <div 
          className="p-4 rounded-lg flex items-start gap-3"
          style={{ 
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 
          className="text-xl font-semibold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          profile
        </h1>
        <p 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          manage your account information
        </p>
      </div>

      {/* Email (read-only) */}
      <div className="mb-6">
        <label 
          className="block text-sm mb-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          email
        </label>
        <div
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ 
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)'
          }}
        >
          {user.email}
        </div>
        <p 
          className="text-xs mt-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Account created {user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
        </p>
      </div>

      {/* Danger Zone */}
      <div 
        className="rounded-xl p-4 mb-6"
        style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <h3 
          className="text-sm font-medium mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          danger zone
        </h3>
        <p 
          className="text-xs mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          permanently delete your account and all associated data
        </p>
        <button
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ 
            background: 'transparent',
            color: 'var(--error)',
            border: '1px solid var(--error)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--error)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--error)';
          }}
        >
          delete account
        </button>
      </div>

    </div>
  );
}

// AI Connection Section
function AIConnectionSection() {
  const { settings, user, isLoading, isConfigured, saveApiKey, deleteApiKey, updateModel } = useAI();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modelli Claude disponibili (ID API corretti)
  const models = [
    { id: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5', description: 'Most capable, best for complex tasks' },
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', description: 'Balanced performance and speed' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fastest, best for simple tasks' },
  ];

  const selectedModelLabel = models.find(m => m.id === settings.model)?.label || 'Select model';

  // Salva API key
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const result = await saveApiKey(apiKeyInput.trim());

    setIsSaving(false);

    if (result.success) {
      setApiKeyInput('');
      setSuccessMessage('API key saved securely');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error || 'Failed to save API key');
    }
  };

  // Elimina API key
  const handleDeleteApiKey = async () => {
    setIsDeleting(true);
    setError(null);

    const result = await deleteApiKey();

    setIsDeleting(false);

    if (result.success) {
      setSuccessMessage('API key deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error || 'Failed to delete API key');
    }
  };

  // Cambia modello
  const handleModelChange = async (modelId: string) => {
    setShowModelDropdown(false);
    setError(null);

    const result = await updateModel(modelId);

    if (!result.success) {
      setError(result.error || 'Failed to update model');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  // Non autenticato
  if (!user) {
    return (
      <div>
        <div className="mb-8">
          <h1 
            className="text-xl font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            AI connection
          </h1>
          <p 
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            configure your Anthropic API settings
          </p>
        </div>

        <div 
          className="p-4 rounded-lg flex items-start gap-3"
          style={{ 
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Sign in required
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Please sign in to securely store your API key. Your key will be encrypted and stored in our secure vault.
            </p>
            <Link
              href="/auth/login"
              className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ 
                background: 'var(--accent-primary)',
                color: 'white'
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 
          className="text-xl font-semibold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          AI connection
        </h1>
        <p 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          configure your Anthropic API settings
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div 
          className="mb-6 p-3 rounded-lg flex items-center gap-2"
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <span className="text-sm" style={{ color: '#ef4444' }}>
            {error}
          </span>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div 
          className="mb-6 p-3 rounded-lg flex items-center gap-2"
          style={{ 
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}
        >
          <CheckCircle size={16} style={{ color: '#22c55e' }} />
          <span className="text-sm" style={{ color: '#22c55e' }}>
            {successMessage}
          </span>
        </div>
      )}

      {/* Connection Status */}
      {isConfigured && (
        <div 
          className="mb-6 p-3 rounded-lg flex items-center justify-between"
          style={{ 
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} style={{ color: '#22c55e' }} />
            <span className="text-sm" style={{ color: '#22c55e' }}>
              API key configured and securely stored
            </span>
          </div>
          <button
            onClick={handleDeleteApiKey}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
            style={{ 
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {isDeleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Remove
          </button>
        </div>
      )}

      {/* API Key Input - solo se non configurato */}
      {!isConfigured && (
        <div className="mb-6">
          <label 
            className="block text-sm mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Anthropic API key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-api..."
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm outline-none transition-colors font-mono"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveApiKey();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              disabled={isSaving || !apiKeyInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{ 
                background: apiKeyInput.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: apiKeyInput.trim() ? 'white' : 'var(--text-muted)',
                cursor: apiKeyInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
          <p 
            className="text-xs mt-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Your API key will be encrypted and stored securely. Get your key from{' '}
            <a 
              href="https://console.anthropic.com/settings/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              console.anthropic.com
            </a>
          </p>
        </div>
      )}

      {/* Model Selection */}
      <div className="mb-6">
        <label 
          className="block text-sm mb-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          model
        </label>
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ 
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
            onMouseLeave={(e) => {
              if (!showModelDropdown) {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }
            }}
          >
            <span>{selectedModelLabel}</span>
            <ChevronDown 
              size={16} 
              style={{ 
                color: 'var(--text-muted)',
                transform: showModelDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </button>

          {showModelDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowModelDropdown(false)}
              />
              <div 
                className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-20 animate-fade-in"
                style={{ 
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left"
                    style={{ 
                      background: settings.model === model.id ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (settings.model !== model.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div>
                      <div>{model.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{model.description}</div>
                    </div>
                    {settings.model === model.id && (
                      <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <p 
          className="text-xs mt-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Your data is never used to train AI models and is completely secure.
        </p>
      </div>
    </div>
  );
}
