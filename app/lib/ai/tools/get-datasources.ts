import { tool } from 'ai';
import { z } from 'zod';
import { createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';

/**
 * Get DataSources Tool - Permette all'AI di vedere i database disponibili per l'utente
 * 
 * Capabilities:
 * - Lista tutti i datasources dell'utente autenticato
 * - Include informazioni di connessione (tranne password)
 * - Include documentazione associata
 * - Può filtrare per ID specifico
 */

export interface GetDataSourcesContext {
  userId: string; // User ID autenticato dalla sessione
}

export function createGetDataSourcesTool(context: GetDataSourcesContext) {
  return tool({
    description: `Get information about available data sources (databases) for the current user.

Use this tool to:
- See what databases are connected and available for querying
- Get connection details (host, port, database name, username, etc.)
- View associated documentation files for each database
- Filter by specific datasource ID if needed

The tool returns:
- Basic info: name, type (postgresql, mysql, mongodb, etc.), connection details
- Documentation: all markdown files associated with each datasource
- Status information and metadata

Note: Passwords are excluded for security. You'll get credentials via environment variables when using the bash tool.

Examples:
- List all databases: call with no datasourceId
- Get specific database: call with datasourceId parameter
`,
    inputSchema: z.object({
      datasourceId: z.string().uuid().optional().describe('Optional: specific datasource ID to retrieve. If omitted, returns all datasources for the user.'),
    }),
    execute: async ({ datasourceId }) => {
      try {
        const serviceClient = createServiceClient();

        // Build query
        let query = serviceClient
          .from('data_sources')
          .select(`
            id,
            source_name,
            config,
            created_at,
            documentation (
              id,
              filename,
              markdown_content,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', context.userId)
          .order('created_at', { ascending: false });

        // Filter by ID if specified
        if (datasourceId) {
          query = query.eq('id', datasourceId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[GET_DATASOURCES_TOOL] Query error:', error);
          return {
            success: false,
            error: {
              type: 'DATABASE_ERROR',
              message: 'Failed to retrieve datasources',
              details: error.message,
            },
          };
        }

        // If filtering by ID and nothing found
        if (datasourceId && (!data || data.length === 0)) {
          return {
            success: false,
            error: {
              type: 'NOT_FOUND',
              message: `Datasource with ID '${datasourceId}' not found or doesn't belong to this user`,
            },
          };
        }

        // Transform data - remove passwords, format nicely
        const datasources = data?.map((ds: any) => {
          const config = ds.config || {};
          
          // Extract type and connection info
          const type = config.type || 'unknown';
          
          // Build safe config (no password)
          const safeConfig: Record<string, unknown> = {
            type,
          };

          // Add connection details based on type
          if (type === 'sqlite') {
            safeConfig.filePath = config.filePath;
          } else {
            // For network databases
            if (config.host) safeConfig.host = config.host;
            if (config.port) safeConfig.port = config.port;
            if (config.database) safeConfig.database = config.database;
            if (config.username) safeConfig.username = config.username;
            
            // Indicate if password exists (but don't show it)
            safeConfig.hasPassword = !!config.password;

            // Add type-specific fields
            if (type === 'postgresql') {
              if (config.sslMode) safeConfig.sslMode = config.sslMode;
              if (config.schema) safeConfig.schema = config.schema;
            } else if (type === 'mysql' || type === 'mariadb') {
              if (config.charset) safeConfig.charset = config.charset;
              if (config.sslMode) safeConfig.ssl = config.sslMode === 'require';
            } else if (type === 'sqlserver') {
              if (config.encrypt !== undefined) safeConfig.encrypt = config.encrypt;
              if (config.trustServerCertificate !== undefined) safeConfig.trustServerCertificate = config.trustServerCertificate;
              if (config.instanceName) safeConfig.instanceName = config.instanceName;
            } else if (type === 'mongodb') {
              if (config.authDatabase) safeConfig.authDatabase = config.authDatabase;
              if (config.replicaSet) safeConfig.replicaSet = config.replicaSet;
              if (config.tls !== undefined) safeConfig.tls = config.tls;
            }
          }

          return {
            id: ds.id,
            name: ds.source_name,
            connectionDetails: safeConfig,
            createdAt: ds.created_at,
            documentation: (ds.documentation || []).map((doc: any) => ({
              id: doc.id,
              filename: doc.filename,
              preview: doc.markdown_content.slice(0, 200) + (doc.markdown_content.length > 200 ? '...' : ''),
              fullContentLength: doc.markdown_content.length,
              createdAt: doc.created_at,
              updatedAt: doc.updated_at,
            })),
            documentationCount: (ds.documentation || []).length,
          };
        }) || [];

        return {
          success: true,
          datasources,
          count: datasources.length,
          message: datasourceId 
            ? `Retrieved datasource '${datasources[0]?.name}'`
            : `Found ${datasources.length} datasource(s)`,
        };

      } catch (error) {
        console.error('[GET_DATASOURCES_TOOL] Execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
          success: false,
          error: {
            type: 'EXECUTION_ERROR',
            message: 'Failed to retrieve datasources',
            details: errorMessage,
          },
        };
      }
    },
  });
}

// Export type per uso esterno
export type GetDataSourcesTool = ReturnType<typeof createGetDataSourcesTool>;
