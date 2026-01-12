'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Code, RotateCcw } from 'lucide-react';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: any[];
  created_at: string;
  updated_at: string;
}

interface JSONEditorPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  dashboard: Dashboard | null;
  onSave: () => void;
}

export default function JSONEditorPanel({
  width,
  onWidthChange,
  minWidth = 320,
  maxWidth = 800,
  dashboard,
  onSave,
}: JSONEditorPanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [originalJson, setOriginalJson] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inizializza il JSON quando cambia la dashboard
  useEffect(() => {
    if (dashboard) {
      const formatted = JSON.stringify(dashboard, null, 2);
      setJsonContent(formatted);
      setOriginalJson(formatted);
      setValidationError(null);
      setHasChanges(false);
    }
  }, [dashboard]);

  // Gestione resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  // Valida JSON mentre l'utente scrive
  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    setHasChanges(value !== originalJson);

    try {
      JSON.parse(value);
      setValidationError(null);
    } catch (error) {
      if (error instanceof Error) {
        setValidationError(error.message);
      }
    }
  };

  // Salva le modifiche
  const handleSave = async () => {
    if (!dashboard) return;

    // Valida il JSON
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonContent);
    } catch (error) {
      setValidationError('Invalid JSON format');
      return;
    }

    // Verifica che abbia i campi essenziali
    if (!parsedJson.id || !parsedJson.name || !parsedJson.widgets) {
      setValidationError('JSON must contain id, name, and widgets fields');
      return;
    }

    // Verifica che widgets sia un array
    if (!Array.isArray(parsedJson.widgets)) {
      setValidationError('widgets must be an array');
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsedJson.name,
          description: parsedJson.description,
          widgets: parsedJson.widgets,
          layout_config: parsedJson.layout_config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save dashboard');
      }

      const formatted = JSON.stringify(parsedJson, null, 2);
      setOriginalJson(formatted);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Notifica al parent per ricaricare
      onSave();
    } catch (error) {
      console.error('Error saving dashboard:', error);
      setValidationError('Failed to save dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset alle modifiche
  const handleReset = () => {
    setJsonContent(originalJson);
    setValidationError(null);
    setHasChanges(false);
  };

  // Format JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      setValidationError(null);
    } catch (error) {
      // Non fare nulla se il JSON non è valido
    }
  };

  return (
    <div 
      ref={panelRef}
      className="h-full flex border-l"
      style={{ 
        width: `${width}px`,
        background: 'var(--bg-primary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Resize Handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={handleMouseDown}
        style={{
          background: isResizing ? 'rgba(59, 130, 246, 0.5)' : 'transparent'
        }}
      />

      {/* Panel Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Code size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              JSON Editor
            </h2>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {!dashboard ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a dashboard to edit
              </p>
            </div>
          ) : (
            <>
              {/* Validation Status */}
              {validationError && (
                <div 
                  className="mb-3 p-3 rounded-lg flex items-start gap-2 text-xs"
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444'
                  }}
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {saveSuccess && (
                <div 
                  className="mb-3 p-3 rounded-lg flex items-center gap-2 text-xs"
                  style={{ 
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22c55e'
                  }}
                >
                  <CheckCircle size={14} />
                  <span>Saved successfully!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || !!validationError || isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: hasChanges && !validationError ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: hasChanges && !validationError ? 'white' : 'var(--text-muted)',
                    opacity: (!hasChanges || validationError || isSaving) ? 0.5 : 1,
                    cursor: (!hasChanges || validationError || isSaving) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: hasChanges ? 'var(--text-secondary)' : 'var(--text-muted)',
                    opacity: !hasChanges ? 0.5 : 1,
                    cursor: !hasChanges ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (hasChanges) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                >
                  <RotateCcw size={14} />
                  Reset
                </button>

                <button
                  onClick={handleFormat}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                >
                  <Code size={14} />
                  Format
                </button>
              </div>

              {/* JSON Textarea */}
              <textarea
                ref={textareaRef}
                value={jsonContent}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="flex-1 w-full p-3 rounded-lg text-xs font-mono resize-none"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${validationError ? '#ef4444' : 'var(--border-default)'}`,
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                spellCheck={false}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
