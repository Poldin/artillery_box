'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import ChartWidget from '../../components/widgets/ChartWidget';
import TableWidget from '../../components/widgets/TableWidget';
import MarkdownWidget from '../../components/widgets/MarkdownWidget';
import QueryWidget from '../../components/widgets/QueryWidget';

interface Widget {
  id: string;
  type: 'chart' | 'table' | 'markdown' | 'query';
  title: string;
  position: number;
  created_at?: string;
  updated_at?: string;
  
  // Dynamic widget fields
  isDynamic?: boolean;
  dataSource?: {
    datasourceId: string;
    query: string;
  };
  template?: {
    chartType?: string;
    plotlyConfig?: {
      data: Plotly.Data[];
      layout?: Partial<Plotly.Layout>;
    };
    columns?: string[];
    rows?: unknown[][];
    content?: string;
  };
  lastFetched?: string;
  fetchError?: string;
  
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

// Sostituisce placeholder {{column_name}} con valori reali
const replacePlaceholders = (template: unknown, data: Record<string, unknown>[], widgetType: 'chart' | 'table' | 'markdown' | 'query'): unknown => {
  if (!data || data.length === 0) return template;
  
  const templateStr = JSON.stringify(template);
  
  // Caso speciale: {{*}} per tabelle
  if (templateStr.includes('"{{*}}"')) {
    const templateObj = template as { columns?: string[]; rows?: string };
    const columns = templateObj.columns || Object.keys(data[0]);
    const rows = data.map(row => columns.map(col => row[col]));
    return { ...templateObj, columns, rows };
  }
  
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let result = templateStr;
  
  const matches = templateStr.match(placeholderRegex);
  if (matches) {
    const uniqueMatches = [...new Set(matches)];
    
    for (const match of uniqueMatches) {
      const columnName = match.replace(/\{\{|\}\}/g, '').trim();
      
      if (widgetType === 'markdown') {
        const value = data[0]?.[columnName];
        const valueStr = value !== null && value !== undefined ? String(value) : '';
        const escapedValue = valueStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        result = result.split(match).join(escapedValue);
      } else {
        const columnValues = data.map(row => row[columnName]);
        result = result.replace(`"${match}"`, JSON.stringify(columnValues));
      }
    }
  }
  
  return JSON.parse(result);
};

// Fetcha dati per un singolo widget dinamico (usa endpoint pubblico per dashboard condivise)
const fetchWidgetData = async (widget: Widget, sharingUid: string): Promise<Widget> => {
  if (!widget.isDynamic || !widget.dataSource) {
    return widget;
  }

  try {
    // Usa l'endpoint pubblico specifico per dashboard condivise
    const response = await fetch(`/api/dashboards/shared/${sharingUid}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetId: widget.id,
      }),
    });

    const result = await response.json();

    if (result.success && result.data) {
      const hydratedData = widget.template 
        ? replacePlaceholders(widget.template, result.data as Record<string, unknown>[], widget.type)
        : widget.data;

      return {
        ...widget,
        data: hydratedData as Widget['data'],
        lastFetched: result.executedAt || new Date().toISOString(),
        fetchError: undefined,
      };
    } else {
      console.error('[Dashare] Query failed for', widget.id, ':', result.error);
      return {
        ...widget,
        fetchError: result.error || 'Failed to fetch data',
      };
    }
  } catch (error) {
    console.error('[Dashare] Error fetching widget data:', widget.id, error);
    return {
      ...widget,
      fetchError: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Hydrata tutti i widget dinamici
const hydrateWidgets = async (widgets: Widget[], sharingUid: string): Promise<Widget[]> => {
  const hydratedPromises = widgets.map(widget => 
    widget.isDynamic ? fetchWidgetData(widget, sharingUid) : Promise.resolve(widget)
  );
  return Promise.all(hydratedPromises);
};

export default function SharedDashboardPage() {
  const params = useParams();
  const sharingId = params.id as string;
  
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [hydratedWidgets, setHydratedWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedDashboard = useCallback(async () => {
    if (!sharingId) {
      setError('Invalid dashboard link');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[Dashare] Fetching dashboard:', sharingId);
      const response = await fetch(`/api/dashboards/shared/${sharingId}`);
      
      console.log('[Dashare] Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Dashboard not found or no longer shared');
        } else {
          setError('Failed to load dashboard');
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[Dashare] Dashboard loaded:', data.dashboard?.name);
      console.log('[Dashare] Widgets count:', data.dashboard?.widgets?.length);
      
      setDashboard(data.dashboard);
      
      // Hydrata i widget dinamici
      if (data.dashboard?.widgets?.length > 0) {
        const hasDynamic = data.dashboard.widgets.some((w: Widget) => w.isDynamic);
        console.log('[Dashare] Has dynamic widgets:', hasDynamic);
        
        if (hasDynamic) {
          setIsHydrating(true);
          const hydrated = await hydrateWidgets(data.dashboard.widgets, sharingId);
          setHydratedWidgets(hydrated);
          setIsHydrating(false);
        } else {
          setHydratedWidgets(data.dashboard.widgets);
        }
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('[Dashare] Error fetching shared dashboard:', err);
      setError('Failed to load dashboard');
      setIsLoading(false);
    }
  }, [sharingId]);

  useEffect(() => {
    fetchSharedDashboard();
  }, [fetchSharedDashboard]);
  
  // Usa i widget hydratati se disponibili
  const widgets = hydratedWidgets.length > 0 ? hydratedWidgets : (dashboard?.widgets || []);

  const truncateDescription = (text: string | undefined) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= 10) return text;
    return words.slice(0, 10).join(' ') + '...';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Public Header */}
      <header 
        className="flex items-center justify-between px-4 border-b select-none"
        style={{ 
          height: 'var(--topbar-height)',
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Left section - Brand */}
        <div className="flex items-center gap-3">
          <span 
            className="font-semibold text-sm tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Vetrinae
          </span>
        </div>

        {/* Right section - Get Started Button */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ 
            background: 'var(--accent-primary)',
            color: 'white'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          get started
          <ArrowRight size={14} />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Loading shared dashboard...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 max-w-md text-center">
              <AlertCircle size={48} className="text-gray-500" />
              <div>
                <p className="text-base mb-2 text-white">
                  {error}
                </p>
                <p className="text-sm text-gray-400">
                  The dashboard you&apos;re looking for might have been deleted or is no longer being shared.
                </p>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors mt-4 bg-gray-800 text-white border border-gray-600 hover:bg-gray-700"
              >
                Go to Vetrinae
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : dashboard ? (
          <>
            {/* Dashboard Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <h1 
                  className="text-base font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {dashboard.name}
                </h1>
                {dashboard.description && (
                  <p 
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {truncateDescription(dashboard.description)}
                  </p>
                )}
              </div>
              <div 
                className="px-2 py-1 rounded text-xs"
                style={{ 
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6'
                }}
              >
                Read-only
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="flex-1 overflow-auto p-4">
              {isHydrating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Loading data...
                    </p>
                  </div>
                </div>
              ) : widgets.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'var(--text-muted)' }}>
                    This dashboard is empty
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-6xl mx-auto">
                  {[...widgets]
                    .sort((a, b) => a.position - b.position)
                    .map((widget) => {
                      const minHeightClass = widget.type === 'chart' ? 'min-h-[300px]' : '';
                      
                      return (
                        <div key={widget.id} className={minHeightClass}>
                          {widget.type === 'chart' && (widget.data.plotlyConfig || widget.isDynamic) && (
                            <ChartWidget
                              title={widget.title}
                              plotlyConfig={widget.data.plotlyConfig || { data: [], layout: {} }}
                              updatedAt={widget.lastFetched || widget.updated_at}
                              readOnly={true}
                            />
                          )}
                          {widget.type === 'table' && ((widget.data.columns && widget.data.rows) || widget.isDynamic) && (
                            <TableWidget
                              title={widget.title}
                              columns={widget.data.columns || []}
                              rows={widget.data.rows || []}
                              updatedAt={widget.lastFetched || widget.updated_at}
                              readOnly={true}
                            />
                          )}
                          {widget.type === 'markdown' && (widget.data.content || widget.isDynamic) && (
                            <MarkdownWidget
                              title={widget.title}
                              content={widget.data.content || 'Loading...'}
                              updatedAt={widget.lastFetched || widget.updated_at}
                              readOnly={true}
                              widgetId={widget.id}
                              dashboardId={dashboard.id}
                            />
                          )}
                          {widget.type === 'query' && widget.data.query && (
                            <QueryWidget
                              title={widget.title}
                              query={widget.data.query}
                              description={widget.data.description}
                              updatedAt={widget.updated_at}
                              readOnly={true}
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 max-w-md text-center">
              <AlertCircle size={48} className="text-gray-500" />
              <div>
                <p className="text-base mb-2 text-white">
                  Something went wrong
                </p>
                <p className="text-sm text-gray-400">
                  Unable to load the dashboard. Please try refreshing the page.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors mt-4 bg-gray-800 text-white border border-gray-600 hover:bg-gray-700"
              >
                Refresh page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
