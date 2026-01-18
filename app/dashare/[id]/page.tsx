'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function SharedDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const sharingId = params.id as string;
  
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sharingId) {
      fetchSharedDashboard();
    }
  }, [sharingId]);

  const fetchSharedDashboard = async () => {
    try {
      const response = await fetch(`/api/dashboards/shared/${sharingId}`);
      
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
      setDashboard(data.dashboard);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching shared dashboard:', err);
      setError('Failed to load dashboard');
      setIsLoading(false);
    }
  };

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
              <AlertCircle size={48} style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                  {error}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  The dashboard you're looking for might have been deleted or is no longer being shared.
                </p>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors mt-4"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
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
              {dashboard.widgets.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'var(--text-muted)' }}>
                    This dashboard is empty
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-6xl mx-auto">
                  {[...dashboard.widgets]
                    .sort((a, b) => a.position - b.position)
                    .map((widget) => (
                      <div key={widget.id} className="min-h-[300px]">
                        {widget.type === 'chart' && widget.data.plotlyConfig && (
                          <ChartWidget
                            title={widget.title}
                            plotlyConfig={widget.data.plotlyConfig}
                            updatedAt={widget.updated_at}
                            readOnly={true}
                          />
                        )}
                        {widget.type === 'table' && widget.data.columns && widget.data.rows && (
                          <TableWidget
                            title={widget.title}
                            columns={widget.data.columns}
                            rows={widget.data.rows}
                            updatedAt={widget.updated_at}
                            readOnly={true}
                          />
                        )}
                        {widget.type === 'markdown' && widget.data.content && (
                          <MarkdownWidget
                            title={widget.title}
                            content={widget.data.content}
                            updatedAt={widget.updated_at}
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
                    ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
