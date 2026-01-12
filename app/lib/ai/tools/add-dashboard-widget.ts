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

**Widget Types:**

1. **chart** - Plotly charts (bar, line, pie, scatter, etc.)
   Required: plotlyConfig with data and optional layout
   
2. **table** - Data tables
   Required: columns (array of strings), rows (array of arrays)
   
3. **markdown** - Text notes and summaries
   Required: content (markdown text)
   
4. **query** - Saved SQL queries
   Required: query (SQL text), optional: description, datasourceId

**Adding vs Updating:**
- To ADD new widget: provide dashboardId only (widgetId will be auto-generated)
- To UPDATE existing widget: provide both dashboardId AND widgetId
- Updating replaces the widget's data completely

**Examples:**
- Add bar chart: dashboardId="...", type="chart", plotlyConfig={...}
- Update table: dashboardId="...", widgetId="widget-123", type="table", columns=[...], rows=[...]
- New dashboard: omit dashboardId, provide dashboardName="Sales Analytics", dashboardDescription="Q1 sales performance"

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
      widgetType: z.enum(['chart', 'table', 'markdown', 'query']).describe('Type of widget: chart, table, markdown, or query'),
      title: z.string().describe('Widget title (e.g., "Monthly Revenue", "Top Products")'),
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
        // Query data
        query: z.string().optional(),
        description: z.string().optional(),
        datasourceId: z.string().uuid().optional(),
      }).describe('Widget data - structure depends on widgetType'),
    }),
    execute: async ({ dashboardId, widgetId, dashboardName, dashboardDescription, widgetType, title, data }): Promise<AddWidgetResult> => {
      try {
        const serviceClient = createServiceClient();
        let targetDashboardId = dashboardId;
        let targetDashboardName = '';

        // Validate widget data based on type
        if (widgetType === 'chart' && !data.plotlyConfig) {
          return {
            success: false,
            error: {
              type: 'INVALID_WIDGET_DATA',
              message: 'Chart widget requires plotlyConfig',
              hint: 'Provide plotlyConfig with data array and optional layout object',
            },
          };
        }

        if (widgetType === 'table' && (!data.columns || !data.rows)) {
          return {
            success: false,
            error: {
              type: 'INVALID_WIDGET_DATA',
              message: 'Table widget requires columns and rows',
              hint: 'Provide columns (array of strings) and rows (array of arrays)',
            },
          };
        }

        if (widgetType === 'markdown' && !data.content) {
          return {
            success: false,
            error: {
              type: 'INVALID_WIDGET_DATA',
              message: 'Markdown widget requires content',
              hint: 'Provide content as markdown text string',
            },
          };
        }

        if (widgetType === 'query' && !data.query) {
          return {
            success: false,
            error: {
              type: 'INVALID_WIDGET_DATA',
              message: 'Query widget requires query',
              hint: 'Provide query as SQL text string',
            },
          };
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
            data,
          };

          updatedWidgets = [...widgets];
          updatedWidgets[widgetIndex] = updatedWidget;
          widgetIdToUse = widgetId;
          isUpdate = true;
          
          console.log('[ADD_DASHBOARD_WIDGET] Updating widget:', widgetId);
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
            data,
          };

          updatedWidgets = [...widgets, newWidget];
          
          console.log('[ADD_DASHBOARD_WIDGET] Creating new widget:', widgetIdToUse);
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
