import { tool } from 'ai';
import { z } from 'zod';
import { createServiceClient } from '@/app/lib/supabase';

/**
 * Get Dashboards Tool - Permette all'AI di vedere le dashboard dell'utente
 * 
 * Capabilities:
 * - Lista tutte le dashboard dell'utente
 * - Mostra i widget contenuti in ogni dashboard
 * - Aiuta l'AI a scegliere la dashboard giusta invece di crearne sempre di nuove
 */

export interface GetDashboardsContext {
  userId: string;
}

// Result type
type GetDashboardsResult = 
  | { 
      success: true; 
      dashboards: Array<{
        id: string;
        name: string;
        description?: string;
        widgetCount: number;
        widgetTypes: string[];
        widgets: Array<{
          id: string;
          type: string;
          title: string;
          position: number;
        }>;
        createdAt: string;
        updatedAt: string;
      }>;
      count: number;
      message: string;
    }
  | { 
      success: false; 
      error: {
        type: string;
        message: string;
        details?: string;
      };
    };

// Factory function per creare il tool con contesto
export function createGetDashboardsTool(context: GetDashboardsContext) {
  return tool({
    description: `Get a list of existing dashboards for the current user.

Use this tool to:
- See what dashboards already exist before creating a new one
- Check dashboard names and their contents
- Choose the appropriate dashboard to add widgets to
- Avoid creating duplicate dashboards

**IMPORTANT**: Always call this tool BEFORE creating a new dashboard or adding widgets.
If suitable dashboard exists, ASK the user which to use.

Returns:
- Dashboard ID, name, and description
- List of widgets (id, type, title, position) - use widgetId to update existing ones
- Number of widgets and their types
- Creation and update timestamps

This helps you make informed decisions about where to add/update visualizations.`,
    inputSchema: z.object({}), // No parameters needed
    execute: async (): Promise<GetDashboardsResult> => {
      try {
        const serviceClient = createServiceClient();

        // Fetch all dashboards for the user
        const { data: dashboards, error } = await serviceClient
          .from('dashboards')
          .select('*')
          .eq('user_id', context.userId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('[GET_DASHBOARDS_TOOL] Query error:', error);
          return {
            success: false,
            error: {
              type: 'DATABASE_ERROR',
              message: 'Failed to retrieve dashboards',
              details: error.message,
            },
          };
        }

        // Transform data
        const dashboardList = (dashboards || []).map((dashboard: any) => {
          const widgets = dashboard.widgets || [];
          const widgetTypes = [...new Set(widgets.map((w: any) => w.type))];

          return {
            id: dashboard.id,
            name: dashboard.name,
            description: dashboard.description,
            widgetCount: widgets.length,
            widgetTypes,
            widgets: widgets.map((w: any) => ({
              id: w.id,
              type: w.type,
              title: w.title,
              position: w.position,
            })),
            createdAt: dashboard.created_at,
            updatedAt: dashboard.updated_at,
          };
        });

        return {
          success: true,
          dashboards: dashboardList,
          count: dashboardList.length,
          message: dashboardList.length === 0 
            ? 'No dashboards found. You can create a new one.'
            : `Found ${dashboardList.length} dashboard(s)`,
        };

      } catch (error) {
        console.error('[GET_DASHBOARDS_TOOL] Execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
          success: false,
          error: {
            type: 'EXECUTION_ERROR',
            message: 'Failed to retrieve dashboards',
            details: errorMessage,
          },
        };
      }
    },
  });
}

// Export type per uso esterno
export type GetDashboardsTool = ReturnType<typeof createGetDashboardsTool>;
