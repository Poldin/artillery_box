'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ChevronDown, Plus, Check, MessageSquare, Share2, Loader2, Edit3, Trash2, Code } from 'lucide-react';
import { useAuth } from '../lib/auth';
import ChartWidget from './widgets/ChartWidget';
import TableWidget from './widgets/TableWidget';
import MarkdownWidget from './widgets/MarkdownWidget';
import QueryWidget from './widgets/QueryWidget';
import CreateDashboardModal from './CreateDashboardModal';
import DashboardChangeNotification from './DashboardChangeNotification';
import ShareDashboardModal from './ShareDashboardModal';

export interface Widget {
  id: string;
  type: 'chart' | 'table' | 'markdown' | 'query';
  title: string;
  position: number;
  created_at?: string;
  updated_at?: string;
  
  // Dynamic widget fields
  isDynamic?: boolean; // Se true, i dati vengono fetchati dinamicamente
  dataSource?: {
    datasourceId: string;
    query: string;
  };
  template?: {
    // Template per widget dinamici (con placeholder {{column_name}})
    chartType?: string;
    plotlyConfig?: {
      data: Plotly.Data[];
      layout?: Partial<Plotly.Layout>;
    };
    columns?: string[];
    rows?: unknown[][];
  };
  lastFetched?: string; // Timestamp dell'ultimo fetch
  fetchError?: string; // Errore nell'ultimo fetch (manteniamo dati vecchi + errore)
  
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

export interface Dashboard {
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
  isJsonEditorOpen?: boolean;
  onToggleJsonEditor?: () => void;
  modifiedDashboardId?: string | null; // Dashboard ID modificata dall'AI
  modifiedDashboardName?: string | null; // Nome dashboard modificata
  onNotificationDismiss?: () => void; // Callback quando notifica viene chiusa
  onSelectedDashboardChange?: (dashboard: Dashboard | null) => void; // Callback quando cambia dashboard selezionata
  dashboardVersion?: number; // Versione per forzare ricaricamento
}

export default function DashboardCanvas({ 
  isChatOpen = true, 
  onToggleChat,
  isJsonEditorOpen = false,
  onToggleJsonEditor,
  modifiedDashboardId,
  modifiedDashboardName,
  onNotificationDismiss,
  onSelectedDashboardChange,
  dashboardVersion = 0,
}: DashboardCanvasProps) {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [deletingDashboardId, setDeletingDashboardId] = useState<string | null>(null);
  const [hoveredDashboardId, setHoveredDashboardId] = useState<string | null>(null);
  const [widgetToDelete, setWidgetToDelete] = useState<string | null>(null); // Widget ID con 1 click, conferma al 2° click
  const [showShareModal, setShowShareModal] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hydratedWidgets, setHydratedWidgets] = useState<Widget[]>([]); // Widget con dati dinamici fetchati
  const [isHydrating, setIsHydrating] = useState(false); // Loading state per hydration
  const hydratedDashboardIdRef = useRef<string | null>(null); // Track quale dashboard è stata hydratata

  const selectedDashboard = dashboards.find(d => d.id === selectedDashboardId);
  const selectedDashboardName = selectedDashboard?.name || 'Select Dashboard';
  
  // Usa sempre hydratedWidgets se appartengono alla dashboard corrente
  // I widget nel DB hanno data: {} vuoto per i dinamici, quindi preferiamo sempre la cache
  const useHydratedCache = hydratedWidgets.length > 0 && hydratedDashboardIdRef.current === selectedDashboardId;
  
  const widgets = useHydratedCache 
    ? hydratedWidgets 
    : (selectedDashboard?.widgets || []);
  
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
  // NOTA: usiamo user?.id invece di user per evitare che il refresh della sessione
  // Supabase (che crea un nuovo oggetto user con la stessa identity) causi un refetch
  // inutile che perderebbe i dati hydrated dei widget dinamici
  }, [user?.id, selectedDashboardId]);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);
  
  // Hydrata widget al mount iniziale (quando selectedDashboard è già definita da localStorage)
  useEffect(() => {
    if (selectedDashboard?.widgets && selectedDashboard.widgets.length > 0 && selectedDashboard.id) {
      const hasDynamic = selectedDashboard.widgets.some(w => w.isDynamic);
      
      if (hasDynamic && hydratedDashboardIdRef.current === null) {
        hydrateWidgets(selectedDashboard.widgets, selectedDashboard.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboards.length]); // Triggera quando arrivano i dati dal server

  // Salva in localStorage quando cambia la dashboard selezionata
  useEffect(() => {
    if (selectedDashboardId) {
      localStorage.setItem('lastDashboardId', selectedDashboardId);
    }
  }, [selectedDashboardId]);

  // Notifica al parent quando cambia la dashboard selezionata
  useEffect(() => {
    if (onSelectedDashboardChange) {
      onSelectedDashboardChange(selectedDashboard || null);
    }
  }, [selectedDashboard, onSelectedDashboardChange]);

  // Reset immediato di hydratedWidgets quando cambia la dashboard selezionata
  // Questo previene di vedere widget della dashboard precedente
  useEffect(() => {
    setHydratedWidgets([]);
    hydratedDashboardIdRef.current = null;
  }, [selectedDashboardId]);

  // Ricarica dashboards quando cambia la versione (dopo salvataggio JSON)
  useEffect(() => {
    if (dashboardVersion > 0) {
      // Reset hydrated widgets per riflettere modifiche dal JSON editor
      setHydratedWidgets([]);
      hydratedDashboardIdRef.current = null;
      fetchDashboards();
    }
  }, [dashboardVersion, fetchDashboards]);

  // Fetch stato condivisione quando cambia la dashboard selezionata
  useEffect(() => {
    const fetchSharingStatus = async () => {
      if (!selectedDashboardId) {
        setIsShared(false);
        return;
      }

      try {
        const response = await fetch(`/api/dashboards/${selectedDashboardId}/share`);
        if (response.ok) {
          const data = await response.json();
          setIsShared(data.is_shared || false);
        }
      } catch (error) {
        console.error('Failed to fetch sharing status:', error);
        setIsShared(false);
      }
    };

    fetchSharingStatus();
  }, [selectedDashboardId]);

  // Mostra notifica quando l'AI modifica una dashboard diversa da quella selezionata
  // e ricarica sempre le dashboard per mostrare i nuovi widget
  useEffect(() => {
    if (modifiedDashboardId) {
      // Reset hydrated widgets per mostrare subito i nuovi widget
      setHydratedWidgets([]);
      hydratedDashboardIdRef.current = null; // Reset ref per forzare re-hydration
      
      // Ricarica sempre le dashboard per mostrare i nuovi widget
      fetchDashboards();
      
      // Mostra notifica solo se è una dashboard diversa da quella corrente
      if (modifiedDashboardId !== selectedDashboardId) {
        setShowNotification(true);
      }
    }
  }, [modifiedDashboardId, selectedDashboardId, fetchDashboards]);

  // Handler per visualizzare la dashboard modificata
  const handleViewModifiedDashboard = () => {
    if (modifiedDashboardId) {
      setSelectedDashboardId(modifiedDashboardId);
      setShowNotification(false);
      onNotificationDismiss?.();
    }
  };

  // Handler per chiudere la notifica
  const handleDismissNotification = () => {
    setShowNotification(false);
    onNotificationDismiss?.();
  };

  // Handler per eliminare dashboard
  const handleDeleteDashboard = async (dashboardId: string) => {
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Se era la dashboard selezionata, cambia selezione
        if (dashboardId === selectedDashboardId) {
          const remainingDashboards = dashboards.filter(d => d.id !== dashboardId);
          if (remainingDashboards.length > 0) {
            setSelectedDashboardId(remainingDashboards[0].id);
          } else {
            setSelectedDashboardId(null);
          }
        }
        
        // Ricarica la lista
        fetchDashboards();
        setDeletingDashboardId(null);
      }
    } catch (error) {
      console.error('[DashboardCanvas] Error deleting dashboard:', error);
    }
  };

  // Handler per eliminare widget (con conferma al secondo click)
  const handleDeleteWidget = async (widgetId: string) => {
    if (!selectedDashboard) return;

    if (widgetToDelete === widgetId) {
      // Secondo click - conferma ed elimina
      try {
        const updatedWidgets = selectedDashboard.widgets.filter(w => w.id !== widgetId);
        
        const response = await fetch(`/api/dashboards/${selectedDashboard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgets: updatedWidgets,
          }),
        });
        
        if (response.ok) {
          // Filtra il widget eliminato dai dati già hydratati (preserva gli altri)
          setHydratedWidgets(prev => prev.filter(w => w.id !== widgetId));
          fetchDashboards();
          setWidgetToDelete(null);
        }
      } catch (error) {
        console.error('[DashboardCanvas] Error deleting widget:', error);
      }
    } else {
      // Primo click - attiva conferma
      setWidgetToDelete(widgetId);
      // Reset dopo 3 secondi
      setTimeout(() => setWidgetToDelete(null), 3000);
    }
  };

  // Sostituisce placeholder {{column_name}} con valori reali
  const replacePlaceholders = (template: unknown, data: Record<string, unknown>[], widgetType: 'chart' | 'table' | 'markdown' | 'query'): unknown => {
    if (!data || data.length === 0) return template;
    
    const templateStr = JSON.stringify(template);
    
    // Caso speciale: {{*}} per tabelle (converte oggetti in array di array)
    if (templateStr.includes('"{{*}}"')) {
      // Estrai le colonne dal template
      const templateObj = template as { columns?: string[]; rows?: string };
      const columns = templateObj.columns || Object.keys(data[0]);
      
      // Converti ogni row in array secondo l'ordine delle colonne
      const rows = data.map(row => 
        columns.map(col => row[col])
      );
      
      return {
        ...templateObj,
        columns,
        rows,
      };
    }
    
    // Trova tutti i placeholder {{column_name}}
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let result = templateStr;
    
    // Sostituisci ogni placeholder
    const matches = templateStr.match(placeholderRegex);
    if (matches) {
      // Rimuovi duplicati (lo stesso placeholder può apparire più volte)
      const uniqueMatches = [...new Set(matches)];
      
      for (const match of uniqueMatches) {
        const columnName = match.replace(/\{\{|\}\}/g, '').trim();
        
        if (widgetType === 'markdown') {
          // Per markdown: usa il primo valore (query dovrebbe ritornare 1 riga)
          const value = data[0]?.[columnName];
          // Sostituisci il placeholder con il valore (può essere stringa, numero, etc)
          const valueStr = value !== null && value !== undefined ? String(value) : '';
          // Escape dei backslash e quotes per JSON (il placeholder è DENTRO una stringa JSON)
          const escapedValue = valueStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          // Per markdown, il placeholder è DENTRO una stringa, non è un valore JSON separato
          // Quindi sostituiamo {{column}} direttamente, non "{{column}}"
          result = result.split(match).join(escapedValue);
        } else {
          // Per chart/table: usa array di tutti i valori
          const columnValues = data.map(row => row[columnName]);
          // Sostituisci "{{column}}" (come valore JSON) con l'array
          result = result.replace(`"${match}"`, JSON.stringify(columnValues));
        }
      }
    }
    
    return JSON.parse(result);
  };

  // Fetcha dati per un singolo widget dinamico
  const fetchWidgetData = async (widget: Widget): Promise<Widget> => {
    if (!widget.isDynamic || !widget.dataSource) {
      return widget;
    }

    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasourceId: widget.dataSource.datasourceId,
          query: widget.dataSource.query,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Hydrata il template con i dati
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
        // Errore nella query - mantieni dati vecchi
        console.error('[DashboardCanvas] Query failed for', widget.id, ':', result.error);
        return {
          ...widget,
          fetchError: result.error || 'Failed to fetch data',
        };
      }
    } catch (error) {
      console.error('[DashboardCanvas] Error fetching widget data:', widget.id, error);
      return {
        ...widget,
        fetchError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  // Hydrata tutti i widget dinamici
  const hydrateWidgets = async (widgets: Widget[], dashboardId: string) => {
    const dynamicWidgets = widgets.filter(w => w.isDynamic);
    
    if (dynamicWidgets.length === 0) {
      setHydratedWidgets(widgets);
      hydratedDashboardIdRef.current = dashboardId;
      setIsHydrating(false);
      return;
    }

    setIsHydrating(true);
    
    try {
      // Fetcha in parallelo tutti i widget dinamici
      const hydratedPromises = widgets.map(widget => 
        widget.isDynamic ? fetchWidgetData(widget) : Promise.resolve(widget)
      );

      const hydrated = await Promise.all(hydratedPromises);
      setHydratedWidgets(hydrated);
      hydratedDashboardIdRef.current = dashboardId;
    } finally {
      setIsHydrating(false);
    }
  };

  // Hydrata widget quando cambia la dashboard selezionata
  useEffect(() => {
    const doHydration = async () => {
      if (selectedDashboard?.widgets && selectedDashboard.widgets.length > 0 && selectedDashboard.id) {
        // Hydrata solo se non abbiamo già dati in cache per questa dashboard
        if (hydratedDashboardIdRef.current !== selectedDashboard.id) {
          await hydrateWidgets(selectedDashboard.widgets, selectedDashboard.id);
        }
      } else {
        setHydratedWidgets([]);
        hydratedDashboardIdRef.current = null;
      }
    };
    
    doHydration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDashboard?.id]); // Triggera solo quando cambia dashboard, non quando cambia il numero di widget

  // NESSUN auto-refresh! L'utente controlla quando refreshare
  // I dati rimangono finché:
  // - L'utente non cambia dashboard
  // - L'utente non clicca manualmente il bottone refresh

  // Handler per refresh manuale
  const handleRefreshData = async () => {
    if (!selectedDashboard?.widgets || !selectedDashboard.id) return;
    
    setIsRefreshing(true);
    await hydrateWidgets(selectedDashboard.widgets, selectedDashboard.id);
    setIsRefreshing(false);
  };

  // Handler per refresh singolo widget
  const handleRefreshWidget = async (widgetId: string) => {
    if (!selectedDashboard) return;
    
    const widget = selectedDashboard.widgets.find(w => w.id === widgetId);
    if (!widget || !widget.isDynamic) return;

    const hydratedWidget = await fetchWidgetData(widget);
    
    // Aggiorna solo questo widget
    setHydratedWidgets(prev => 
      prev.map(w => w.id === widgetId ? hydratedWidget : w)
    );
  };

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
                  <div
                    key={dashboard.id}
                    className="relative"
                    onMouseEnter={() => setHoveredDashboardId(dashboard.id)}
                    onMouseLeave={() => setHoveredDashboardId(null)}
                  >
                    <button
                      onClick={() => {
                        setSelectedDashboardId(dashboard.id);
                        setShowDashboardMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="truncate flex-1">{dashboard.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedDashboardId === dashboard.id && (
                          <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                        )}
                      </div>
                    </button>

                    {/* Delete button - show on hover */}
                    {hoveredDashboardId === dashboard.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingDashboardId(dashboard.id);
                          setShowDashboardMenu(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                        style={{ 
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)',
                          zIndex: 10,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                        }}
                        title="Delete dashboard"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
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
          {selectedDashboard && (
            <button
              onClick={() => setShowShareModal(true)}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: isShared ? 'var(--accent-primary)' : 'var(--text-tertiary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                if (!isShared) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                if (!isShared) {
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }
              }}
              title={isShared ? 'Dashboard is shared' : 'Share dashboard'}
            >
              <Share2 size={14} />
            </button>
          )}

          {/* JSON Editor toggle button */}
          {onToggleJsonEditor && selectedDashboard && (
            <button
              onClick={onToggleJsonEditor}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: isJsonEditorOpen ? 'var(--accent-primary)' : 'var(--text-tertiary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                if (!isJsonEditorOpen) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                if (!isJsonEditorOpen) e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title={isJsonEditorOpen ? 'Close JSON editor' : 'Open JSON editor'}
            >
              <Code size={14} />
            </button>
          )}

          {/* Refresh data button */}
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: isRefreshing ? 'var(--text-muted)' : 'var(--text-tertiary)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = isRefreshing ? 'var(--text-muted)' : 'var(--text-tertiary)';
            }}
            title="Refresh dynamic data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
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
              .map((widget) => {
                // Altezza minima solo per chart (grafici hanno bisogno di spazio)
                const minHeightClass = widget.type === 'chart' ? 'min-h-[300px]' : '';
                
                return (
                  <div key={widget.id} className={minHeightClass}>
                    {widget.type === 'chart' && (widget.data.plotlyConfig || widget.isDynamic) && (
                    <ChartWidget
                      title={widget.title}
                      plotlyConfig={widget.data.plotlyConfig || { data: [], layout: {} }}
                      updatedAt={widget.lastFetched || widget.updated_at}
                      onDelete={() => handleDeleteWidget(widget.id)}
                      isDeleting={widgetToDelete === widget.id}
                      isDynamic={widget.isDynamic}
                      onRefresh={() => handleRefreshWidget(widget.id)}
                      isRefreshing={isHydrating}
                      fetchError={widget.fetchError}
                    />
                  )}
                  {widget.type === 'table' && ((widget.data.columns && widget.data.rows) || widget.isDynamic) && (
                    <TableWidget
                      title={widget.title}
                      columns={widget.data.columns || []}
                      rows={widget.data.rows || []}
                      updatedAt={widget.lastFetched || widget.updated_at}
                      onDelete={() => handleDeleteWidget(widget.id)}
                      isDeleting={widgetToDelete === widget.id}
                      isDynamic={widget.isDynamic}
                      onRefresh={() => handleRefreshWidget(widget.id)}
                      isRefreshing={isHydrating}
                      fetchError={widget.fetchError}
                    />
                  )}
                  {widget.type === 'markdown' && (widget.data.content || widget.isDynamic) && (
                    <MarkdownWidget
                      title={widget.title}
                      content={widget.data.content || 'Loading...'}
                      updatedAt={widget.lastFetched || widget.updated_at}
                      onDelete={() => handleDeleteWidget(widget.id)}
                      isDeleting={widgetToDelete === widget.id}
                      widgetId={widget.id}
                      dashboardId={selectedDashboard.id}
                      onUpdate={fetchDashboards}
                      isDynamic={widget.isDynamic}
                      onRefresh={() => handleRefreshWidget(widget.id)}
                      isRefreshing={isHydrating}
                      fetchError={widget.fetchError}
                    />
                  )}
                  {widget.type === 'query' && widget.data.query && (
                    <QueryWidget
                      title={widget.title}
                      query={widget.data.query}
                      description={widget.data.description}
                      updatedAt={widget.updated_at}
                      onDelete={() => handleDeleteWidget(widget.id)}
                      isDeleting={widgetToDelete === widget.id}
                    />
                  )}
                  </div>
                );
              })}
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

      {/* Dashboard Change Notification */}
      {showNotification && modifiedDashboardName && (
        <DashboardChangeNotification
          dashboardName={modifiedDashboardName}
          onViewDashboard={handleViewModifiedDashboard}
          onDismiss={handleDismissNotification}
        />
      )}

      {/* Share Dashboard Modal */}
      {selectedDashboard && (
        <ShareDashboardModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            // Ricarica lo stato di condivisione dopo la chiusura del modal
            if (selectedDashboardId) {
              fetch(`/api/dashboards/${selectedDashboardId}/share`)
                .then(res => res.json())
                .then(data => setIsShared(data.is_shared || false))
                .catch(err => console.error('Failed to fetch sharing status:', err));
            }
          }}
          dashboardId={selectedDashboard.id}
          dashboardName={selectedDashboard.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDashboardId && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDeletingDashboardId(null)}
          />
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 rounded-lg p-4"
            style={{ 
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h4 
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Delete Dashboard?
            </h4>
            <p 
              className="text-xs mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              This action cannot be undone. The dashboard{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {dashboards.find(d => d.id === deletingDashboardId)?.name}
              </strong>
              {' '}and all its widgets will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingDashboardId(null)}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDashboard(deletingDashboardId)}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{ 
                  background: '#ef4444',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
