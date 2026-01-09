'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, Plus, Check, MessageSquare, Share2, Loader2, Edit3 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import ChartWidget from './widgets/ChartWidget';
import TableWidget from './widgets/TableWidget';
import MarkdownWidget from './widgets/MarkdownWidget';
import QueryWidget from './widgets/QueryWidget';
import CreateDashboardModal from './CreateDashboardModal';

interface Widget {
  id: string;
  type: 'chart' | 'table' | 'markdown' | 'query';
  title: string;
  position: number;
  data: {
    // Chart
    chartType?: string;
    plotlyConfig?: {
      data: Plotly.Data[];
      layout?: Partial<Plotly.Layout>;
    };
    // Table
    columns?: string[];
    rows?: unknown[][];
    // Markdown
    content?: string;
    // Query
    query?: string;
    description?: string;
    datasourceId?: string;
  };
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
}

interface DashboardCanvasProps {
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

export default function DashboardCanvas({ isChatOpen = true, onToggleChat }: DashboardCanvasProps) {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedDashboard = dashboards.find(d => d.id === selectedDashboardId);
  const selectedDashboardName = selectedDashboard?.name || 'Select Dashboard';
  const widgets = selectedDashboard?.widgets || [];
  
  // Tronca descrizione a max 10 parole
  const truncateDescription = (text: string | undefined) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= 10) return text;
    return words.slice(0, 10).join(' ') + '...';
  };

  // Fetch dashboards
  const fetchDashboards = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/dashboards');
      if (response.ok) {
        const data = await response.json();
        setDashboards(data.dashboards);
        
        // Se non c'è una dashboard selezionata
        if (!selectedDashboardId && data.dashboards.length > 0) {
          // Prova a caricare l'ultima usata da localStorage
          const lastUsedId = localStorage.getItem('lastDashboardId');
          const lastUsedExists = data.dashboards.find((d: Dashboard) => d.id === lastUsedId);
          
          if (lastUsedId && lastUsedExists) {
            setSelectedDashboardId(lastUsedId);
          } else {
            // Fallback alla prima dashboard
            setSelectedDashboardId(data.dashboards[0].id);
            localStorage.setItem('lastDashboardId', data.dashboards[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDashboardId]);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  // Salva in localStorage quando cambia la dashboard selezionata
  useEffect(() => {
    if (selectedDashboardId) {
      localStorage.setItem('lastDashboardId', selectedDashboardId);
    }
  }, [selectedDashboardId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Top bar with dashboard selector and refresh */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Dashboard Dropdown + Description */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowDashboardMenu(!showDashboardMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors"
              style={{ 
                color: 'var(--text-primary)',
                background: showDashboardMenu ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
              onMouseLeave={(e) => {
                if (!showDashboardMenu) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }
              }}
            >
              {selectedDashboardName}
              <ChevronDown 
                size={14} 
                style={{ 
                  color: 'var(--text-muted)',
                  transform: showDashboardMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </button>

          {showDashboardMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowDashboardMenu(false)}
              />
              
              {/* Dropdown Menu */}
              <div 
                className="absolute left-0 top-full mt-1 w-56 py-1 rounded-lg shadow-xl z-50 animate-fade-in"
                style={{ 
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)'
                }}
              >
                {dashboards.map((dashboard) => (
                  <button
                    key={dashboard.id}
                    onClick={() => {
                      setSelectedDashboardId(dashboard.id);
                      setShowDashboardMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {dashboard.name}
                    {selectedDashboardId === dashboard.id && (
                      <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                    )}
                  </button>
                ))}
                
                {/* Separator */}
                <div 
                  className="my-1 h-px"
                  style={{ background: 'var(--border-subtle)' }}
                />
                
                {/* Add new dashboard button */}
                <button
                  onClick={() => {
                    setShowDashboardMenu(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                  style={{ color: 'var(--accent-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={14} />
                  new dashboard
                </button>
              </div>
            </>
          )}
          </div>
          
          {/* Dashboard Description */}
          {selectedDashboard?.description && (
            <p 
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {truncateDescription(selectedDashboard.description)}
            </p>
          )}
          
          {/* Edit Dashboard Button */}
          {selectedDashboard && (
            <button
              onClick={() => setEditingDashboard(selectedDashboard)}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title="Edit dashboard"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
            title="Share dashboard"
          >
            <Share2 size={14} />
          </button>

          {/* Refresh data button */}
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
            title="Refresh data"
          >
            <RefreshCw size={14} />
          </button>

          {/* Chat toggle button */}
          {onToggleChat && (
            <button
              onClick={onToggleChat}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: isChatOpen ? 'var(--accent-primary)' : 'var(--text-tertiary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                if (!isChatOpen) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                if (!isChatOpen) e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title={isChatOpen ? 'Close chat' : 'Open chat'}
            >
              <MessageSquare size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-muted)' }}>
              Please sign in to view dashboards
            </p>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-center">
              <p className="mb-1" style={{ color: 'var(--text-secondary)' }}>
                No dashboards yet
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Create your first dashboard to start organizing your data
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Plus size={16} />
              create your first dashboard
            </button>
          </div>
        ) : !selectedDashboard ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-muted)' }}>
              Select a dashboard from the dropdown
            </p>
          </div>
        ) : widgets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-muted)' }}>
              This dashboard is empty. Chat with AI to analyse data sources.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-6xl mx-auto">
            {[...widgets]
              .sort((a, b) => a.position - b.position)
              .map((widget) => (
                <div key={widget.id} className="min-h-[300px]">
                  {widget.type === 'chart' && widget.data.plotlyConfig && (
                    <ChartWidget
                      title={widget.title}
                      plotlyConfig={widget.data.plotlyConfig}
                    />
                  )}
                  {widget.type === 'table' && widget.data.columns && widget.data.rows && (
                    <TableWidget
                      title={widget.title}
                      columns={widget.data.columns}
                      rows={widget.data.rows}
                    />
                  )}
                  {widget.type === 'markdown' && widget.data.content && (
                    <MarkdownWidget
                      title={widget.title}
                      content={widget.data.content}
                    />
                  )}
                  {widget.type === 'query' && widget.data.query && (
                    <QueryWidget
                      title={widget.title}
                      query={widget.data.query}
                      description={widget.data.description}
                    />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Create Dashboard Modal */}
      <CreateDashboardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchDashboards}
      />

      {/* Edit Dashboard Modal */}
      <CreateDashboardModal
        isOpen={!!editingDashboard}
        onClose={() => setEditingDashboard(null)}
        onCreated={() => {
          fetchDashboards();
          setEditingDashboard(null);
        }}
        dashboardToEdit={editingDashboard}
      />
    </div>
  );
}
