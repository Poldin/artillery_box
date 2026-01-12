import { tool } from 'ai';
import { z } from 'zod';
import { createServiceClient } from '@/app/lib/supabase';
import { randomUUID } from 'crypto';

/**
 * Add/Update Dashboard Widget Tool - Permette all'AI di aggiungere o modificare widget
 * 
 * Capabilities:
 * - Aggiunge nuovi widget a dashboard esistenti
 * - Modifica widget esistenti per ID
 * - Crea automaticamente una nuova dashboard se non esiste
 * - Gestisce il position automaticamente
 * - Supporta tutti i tipi di widget Plotly
 */

export interface AddDashboardWidgetContext {
  userId: string;
}

// Error types
type AddWidgetError = 
  | { type: 'DASHBOARD_NOT_FOUND'; message: string; hint: string }
  | { type: 'INVALID_WIDGET_DATA'; message: string; hint: string }
  | { type: 'DATABASE_ERROR'; message: string; details: string }
  | { type: 'EXECUTION_ERROR'; message: string; details: string };

// Result type
type AddWidgetResult = 
  | { success: true; message: string; dashboardId: string; dashboardName: string; widgetId: string; widgetTitle: string }
  | { success: false; error: AddWidgetError };

// Factory function per creare il tool con contesto
export function createAddDashboardWidgetTool(context: AddDashboardWidgetContext) {
  return tool({
    description: `Add or update a widget on a dashboard to visualize data and insights.

Use this tool to create or modify visualizations after analyzing data with the bash tool.

**IMPORTANT WORKFLOW:**
1. ALWAYS call getDashboards FIRST to see existing dashboards
2. If a suitable dashboard exists (matching topic/context), ASK the user which one to use
3. If user wants to update existing data, provide widgetId to update (instead of creating new)
4. If no suitable dashboard exists, you can create a new one

**Widget Types: STATIC vs DYNAMIC**

STATIC WIDGETS (data saved in database):
- Use when data doesn't change frequently
- Faster to load (no query execution)
- Good for snapshots, historical data, notes

DYNAMIC WIDGETS (data fetched live from data sources):
- Use when data needs to be always up-to-date
- Set isDynamic=true, provide dataSource (datasourceId + query), and template with {{column_name}} placeholders
- Data refreshes automatically when dashboard opens
- Shown with lightning icon ⚡

**1. chart (Plotly charts)**

STATIC: Provide plotlyConfig with data directly
DYNAMIC: Set isDynamic=true, provide dataSource (datasourceId, query) and template with {{column_name}} placeholders

Example DYNAMIC chart:
{
  isDynamic: true,
  dataSource: {
    datasourceId: "uuid-here",
    query: "SELECT month, revenue FROM sales WHERE year = 2025"
  },
  template: {
    plotlyConfig: {
      data: [{
        x: "{{month}}",
        y: "{{revenue}}",
        type: "bar"
      }]
    }
  }
}

**2. table (Data tables)**

STATIC: Provide columns and rows directly
DYNAMIC: Set isDynamic=true, provide dataSource and template with "rows": "{{*}}" for auto-mapping

Example DYNAMIC table:
{
  isDynamic: true,
  dataSource: {
    datasourceId: "uuid-here",
    query: "SELECT name, revenue, orders FROM customers ORDER BY revenue DESC LIMIT 10"
  },
  template: {
    columns: ["Name", "Revenue", "Orders"],
    rows: "{{*}}"
  }
}

**3. markdown** - Text notes and summaries

STATIC: Provide content with markdown text directly
DYNAMIC: Set isDynamic=true, provide dataSource and template.content with {{column_name}} placeholders

Example DYNAMIC markdown:
{
  isDynamic: true,
  dataSource: {
    datasourceId: "uuid-here",
    query: "SELECT current_date as date, SUM(amount) as total, COUNT(*) as orders FROM sales WHERE date = CURRENT_DATE"
  },
  template: {
    content: "# Daily Report {{date}}\\n\\n**Total Sales:** {{total}}€\\n**Orders:** {{orders}}"
  }
}

Note: Query should return a SINGLE ROW for markdown (use aggregations or LIMIT 1)

**4. query** - DEPRECATED! Use dynamic chart/table instead!
   This type is deprecated. For live data, use isDynamic=true on chart/table widgets.

**Placeholder Syntax:**
- {{column_name}} gets replaced with array of all values from that column
- {{*}} for tables auto-maps all rows
- Column names must match SQL query results exactly

**Adding vs Updating:**
- To ADD new widget: provide dashboardId only (widgetId will be auto-generated)
- To UPDATE existing widget: provide both dashboardId AND widgetId
- Updating replaces the widget's data completely

**Creating dashboards:**
- Always provide a specific dashboardDescription (3-5 words describing the content)
- Examples: "Device monitoring metrics", "Sales performance overview", "Customer analytics dashboard"

Always ask user which dashboard to use if multiple suitable ones exist!
`,
    inputSchema: z.object({
      dashboardId: z.string().uuid().optional().describe('Dashboard ID to add/update widget. If omitted, creates a new dashboard.'),
      widgetId: z.string().optional().describe('Widget ID to update. If provided, updates existing widget. If omitted, creates new widget.'),
      dashboardName: z.string().optional().describe('Name for new dashboard (only used if dashboardId is not provided). Default: "AI Dashboard"'),
      dashboardDescription: z.string().optional().describe('Brief description for new dashboard (3-5 words, e.g., "Sales performance overview"). Only used if creating new dashboard.'),
      widgetType: z.enum(['chart', 'table', 'markdown', 'query']).describe('Type of widget: chart, table, markdown, or query (query is deprecated, use dynamic chart/table instead)'),
      title: z.string().describe('Widget title (e.g., "Monthly Revenue (Live)", "Top Products")'),
      
      // Dynamic widget fields
      isDynamic: z.boolean().optional().describe('Set to true for dynamic widgets that fetch data from a data source. Default: false (static)'),
      dataSource: z.object({
        datasourceId: z.string().uuid().describe('Data source ID to query'),
        query: z.string().describe('SQL query to execute (for SQL databases) or JSON for MongoDB'),
      }).optional().describe('Data source configuration for dynamic widgets. Required if isDynamic=true'),
      template: z.object({
        // Chart template with placeholders
        plotlyConfig: z.object({
          data: z.array(z.unknown()),
          layout: z.unknown().optional(),
        }).optional(),
        // Table template with placeholders
        columns: z.array(z.string()).optional(),
        rows: z.unknown().optional(), // Can be "{{*}}" or array with placeholders
        // Markdown template with placeholders
        content: z.string().optional(),
      }).optional().describe('Template with {{column_name}} placeholders for dynamic widgets. Required if isDynamic=true'),
      
      // Static widget data (for non-dynamic widgets)
      data: z.object({
        // Chart data
        plotlyConfig: z.object({
          data: z.array(z.unknown()),
          layout: z.unknown().optional(),
        }).optional(),
        // Table data
        columns: z.array(z.string()).optional(),
        rows: z.array(z.array(z.unknown())).optional(),
        // Markdown data
        content: z.string().optional(),
        // Query data (deprecated)
        query: z.string().optional(),
        description: z.string().optional(),
        datasourceId: z.string().uuid().optional(),
      }).optional().describe('Widget data for static widgets. For dynamic widgets, use template instead'),
    }),
    execute: async ({ dashboardId, widgetId, dashboardName, dashboardDescription, widgetType, title, isDynamic, dataSource, template, data }): Promise<AddWidgetResult> => {
      try {
        const serviceClient = createServiceClient();
        let targetDashboardId = dashboardId;
        let targetDashboardName = '';

        // Validate dynamic widget requirements
        if (isDynamic) {
          if (!dataSource || !dataSource.datasourceId || !dataSource.query) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Dynamic widgets require dataSource with datasourceId and query',
                hint: 'Provide dataSource: { datasourceId: "uuid", query: "SELECT ..." }',
              },
            };
          }

          if (!template) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Dynamic widgets require template with placeholders',
                hint: 'Provide template with {{column_name}} placeholders matching query results',
              },
            };
          }

          if (widgetType === 'chart' && !template.plotlyConfig) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Dynamic chart widget requires template.plotlyConfig with placeholders',
                hint: 'Example: template: { plotlyConfig: { data: [{ x: "{{column}}", y: "{{value}}" }] } }',
              },
            };
          }

          if (widgetType === 'table' && (!template.columns || !template.rows)) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Dynamic table widget requires template.columns and template.rows',
                hint: 'Example: template: { columns: ["Name", "Value"], rows: "{{*}}" }',
              },
            };
          }

          if (widgetType === 'markdown' && !template.content) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Dynamic markdown widget requires template.content with placeholders',
                hint: 'Example: template: { content: "# Report\\n\\nTotal: {{total}}\\nDate: {{date}}" }',
              },
            };
          }
        }

        // Validate static widget data
        if (!isDynamic && data) {
          if (widgetType === 'chart' && !data.plotlyConfig) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Static chart widget requires data.plotlyConfig',
                hint: 'Provide data.plotlyConfig with data array and optional layout object',
              },
            };
          }

          if (widgetType === 'table' && (!data.columns || !data.rows)) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Static table widget requires data.columns and data.rows',
                hint: 'Provide data.columns (array of strings) and data.rows (array of arrays)',
              },
            };
          }

          if (widgetType === 'markdown' && !data.content) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Markdown widget requires data.content',
                hint: 'Provide data.content as markdown text string',
              },
            };
          }

          if (widgetType === 'query' && !data.query) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: 'Query widget requires data.query',
                hint: 'Note: query widgets are deprecated. Use dynamic chart/table instead with isDynamic=true',
              },
            };
          }
        }

        // Se non è fornito dashboardId, crea una nuova dashboard
        if (!targetDashboardId) {
          console.log('[ADD_DASHBOARD_WIDGET] Creating new dashboard');
          
          const newDashboardName = dashboardName || 'AI Dashboard';
          const newDashboardDescription = dashboardDescription || 'Data insights and visualizations';
          
          const { data: newDashboard, error: createError } = await serviceClient
            .from('dashboards')
            .insert({
              user_id: context.userId,
              name: newDashboardName,
              description: newDashboardDescription,
              widgets: [],
            })
            .select()
            .single();

          if (createError || !newDashboard) {
            console.error('[ADD_DASHBOARD_WIDGET] Failed to create dashboard:', createError);
            return {
              success: false,
              error: {
                type: 'DATABASE_ERROR',
                message: 'Failed to create new dashboard',
                details: createError?.message || 'Unknown error',
              },
            };
          }

          targetDashboardId = newDashboard.id;
          targetDashboardName = newDashboard.name;
          console.log('[ADD_DASHBOARD_WIDGET] Created dashboard:', targetDashboardId);
        }

        // Recupera la dashboard corrente
        const { data: dashboard, error: fetchError } = await serviceClient
          .from('dashboards')
          .select('*')
          .eq('id', targetDashboardId)
          .eq('user_id', context.userId)
          .single();

        if (fetchError || !dashboard) {
          console.error('[ADD_DASHBOARD_WIDGET] Dashboard not found:', fetchError);
          return {
            success: false,
            error: {
              type: 'DASHBOARD_NOT_FOUND',
              message: `Dashboard with ID '${targetDashboardId}' not found or doesn't belong to this user`,
              hint: 'Omit dashboardId to create a new dashboard automatically',
            },
          };
        }

        targetDashboardName = dashboard.name;

        // Crea o aggiorna il widget
        const widgets = dashboard.widgets || [];
        let updatedWidgets;
        let widgetIdToUse;
        let isUpdate = false;

        if (widgetId) {
          // UPDATE: Trova e aggiorna widget esistente
          const widgetIndex = widgets.findIndex((w: any) => w.id === widgetId);
          
          if (widgetIndex === -1) {
            return {
              success: false,
              error: {
                type: 'INVALID_WIDGET_DATA',
                message: `Widget with ID '${widgetId}' not found in dashboard`,
                hint: 'Omit widgetId to create a new widget, or use a valid widgetId from the dashboard',
              },
            };
          }

          // Mantieni la position esistente e created_at
          const existingWidget = widgets[widgetIndex];
          const updatedWidget = {
            id: widgetId,
            type: widgetType,
            title,
            position: existingWidget.position,
            created_at: existingWidget.created_at || new Date().toISOString(), // Mantieni created_at esistente
            updated_at: new Date().toISOString(), // Aggiorna timestamp
            ...(isDynamic ? {
              isDynamic: true,
              dataSource,
              template,
              data: {}, // Empty data for dynamic widgets (will be populated on fetch)
            } : {
              isDynamic: false,
              data: data || {},
            }),
          };

          updatedWidgets = [...widgets];
          updatedWidgets[widgetIndex] = updatedWidget;
          widgetIdToUse = widgetId;
          isUpdate = true;
          
          console.log('[ADD_DASHBOARD_WIDGET] Updating widget:', widgetId, isDynamic ? '(dynamic)' : '(static)');
        } else {
          // ADD: Crea nuovo widget
          const newPosition = widgets.length; // Posiziona alla fine
          widgetIdToUse = `widget-${randomUUID()}`;
          const now = new Date().toISOString();

          const newWidget = {
            id: widgetIdToUse,
            type: widgetType,
            title,
            position: newPosition,
            created_at: now,
            updated_at: now,
            ...(isDynamic ? {
              isDynamic: true,
              dataSource,
              template,
              data: {}, // Empty data for dynamic widgets (will be populated on fetch)
            } : {
              isDynamic: false,
              data: data || {},
            }),
          };

          updatedWidgets = [...widgets, newWidget];
          
          console.log('[ADD_DASHBOARD_WIDGET] Creating new widget:', widgetIdToUse, isDynamic ? '(dynamic)' : '(static)');
        }

        // Aggiorna la dashboard
        const { error: updateError } = await serviceClient
          .from('dashboards')
          .update({
            widgets: updatedWidgets,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetDashboardId)
          .eq('user_id', context.userId);

        if (updateError) {
          console.error('[ADD_DASHBOARD_WIDGET] Failed to update dashboard:', updateError);
          return {
            success: false,
            error: {
              type: 'DATABASE_ERROR',
              message: 'Failed to add widget to dashboard',
              details: updateError.message,
            },
          };
        }

        console.log(`[ADD_DASHBOARD_WIDGET] Widget ${isUpdate ? 'updated' : 'added'} successfully:`, widgetIdToUse);

        // Type guard - questo non dovrebbe mai accadere data la logica sopra
        if (!targetDashboardId) {
          throw new Error('targetDashboardId is undefined after dashboard creation/retrieval');
        }

        return {
          success: true,
          message: isUpdate 
            ? `Widget '${title}' updated in dashboard '${targetDashboardName}'`
            : `Widget '${title}' added to dashboard '${targetDashboardName}'`,
          dashboardId: targetDashboardId,
          dashboardName: targetDashboardName,
          widgetId: widgetIdToUse,
          widgetTitle: title,
        };

      } catch (error) {
        console.error('[ADD_DASHBOARD_WIDGET] Execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
          success: false,
          error: {
            type: 'EXECUTION_ERROR',
            message: 'Failed to add widget to dashboard',
            details: errorMessage,
          },
        };
      }
    },
  });
}

// Export type per uso esterno
export type AddDashboardWidgetTool = ReturnType<typeof createAddDashboardWidgetTool>;
