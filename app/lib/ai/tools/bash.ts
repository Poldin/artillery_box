import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';
import { createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';

/**
 * Bash Tool - Permette all'AI di eseguire comandi bash nel sandbox
 * 
 * Capabilities:
 * - Eseguire query SQL sui database collegati (psql, mysql, mongosh, etc.)
 * - Leggere documentazione con cat, grep, head, tail
 * - Manipolare output con pipe, jq, awk
 * - Qualsiasi comando bash standard
 */

// Tipi per il contesto del sandbox
export interface BashToolContext {
  userId: string; // User ID per recuperare datasources dal DB
}

// Factory function per creare il tool con contesto
export function createBashTool(context: BashToolContext) {
  return tool({
    description: `Execute bash commands in an isolated sandbox environment to query databases and explore data.
    
Use this tool to:
- Execute SQL queries on connected databases using CLI clients (psql, mysql, mongosh, etc.)
- Read documentation files with cat, grep, head, tail, etc.
- Process and transform data with pipes, jq, awk, sed
- Any standard bash operations

**IMPORTANT**: You must specify a datasourceId to connect to a database. Use getDataSources first to see available databases.

The sandbox has pre-installed:
- PostgreSQL client (psql)
- MySQL client (mysql)
- MongoDB shell (mongosh)
- Common unix tools (grep, awk, sed, jq, etc.)

When you provide a datasourceId:
- Database credentials are loaded and set as environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_TYPE
- Documentation files are loaded at /docs/

Examples:
- Read schema docs: cat /docs/schema.md
- Query PostgreSQL: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT * FROM users LIMIT 10"
- Query MySQL: mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES"
- Query MongoDB: mongosh "mongodb://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" --eval "db.users.find().limit(10)"
`,
    inputSchema: z.object({
      datasourceId: z.string().uuid().describe('The ID of the datasource to connect to. Use getDataSources to find available datasources.'),
      command: z.string().describe('The bash command to execute'),
      workingDirectory: z.string().optional().describe('Working directory for the command (default: /home/user)'),
      timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000, max: 120000)'),
    }),
    execute: async ({ datasourceId, command, workingDirectory = '/home/user', timeout = 30000 }) => {
      // Limita il timeout
      const safeTimeout = Math.min(timeout, 120000);
      
      try {
        // 1. Recupera il datasource dal database
        const serviceClient = createServiceClient();
        const { data: datasource, error: dbError } = await serviceClient
          .from('data_sources')
          .select(`
            id,
            source_name,
            config,
            documentation (
              id,
              filename,
              markdown_content
            )
          `)
          .eq('id', datasourceId)
          .eq('user_id', context.userId)
          .single();

        if (dbError || !datasource) {
          return {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: `Datasource with ID '${datasourceId}' not found or doesn't belong to this user`,
            command,
            workingDirectory,
            error: {
              type: 'DATASOURCE_NOT_FOUND',
              message: `Datasource '${datasourceId}' not found`,
              hint: 'Use getDataSources to see available datasources',
            },
          };
        }

        const config = datasource.config || {};
        const dbType = config.type;

        // 2. Prepara le credenziali (decifra password se presente)
        const envVars: Record<string, string> = {
          DB_TYPE: dbType || 'unknown',
        };

        if (dbType === 'sqlite') {
          if (config.filePath) envVars.DB_FILE = config.filePath;
        } else {
          // Network databases
          if (config.host) envVars.DB_HOST = config.host;
          if (config.port) envVars.DB_PORT = String(config.port);
          if (config.database) envVars.DB_NAME = config.database;
          if (config.username) envVars.DB_USER = config.username;
          
          // Decifra la password
          if (config.password) {
            try {
              envVars.DB_PASSWORD = decryptApiKey(config.password);
            } catch (decryptError) {
              return {
                success: false,
                exitCode: 1,
                stdout: '',
                stderr: 'Failed to decrypt database password',
                command,
                workingDirectory,
                error: {
                  type: 'DECRYPTION_ERROR',
                  message: 'Could not decrypt database password',
                  hint: 'The datasource credentials may be corrupted. Try updating them.',
                },
              };
            }
          }

          // Type-specific env vars
          if (dbType === 'postgresql') {
            if (config.schema) envVars.DB_SCHEMA = config.schema;
            if (config.sslMode) envVars.DB_SSL_MODE = config.sslMode;
          } else if (dbType === 'mongodb') {
            if (config.authDatabase) envVars.DB_AUTH_DB = config.authDatabase;
            if (config.replicaSet) envVars.DB_REPLICA_SET = config.replicaSet;
          }
        }

        // 3. Crea il sandbox
        console.log(`[BASH TOOL] Creating sandbox for datasource '${datasource.source_name}' (${dbType})`);
        const sandbox = await Sandbox.create({
          runtime: 'node24', // Runtime con Node.js e strumenti comuni
          timeout: safeTimeout + 10000,
        });

        try {
          // 4. Carica i file di documentazione
          if (datasource.documentation && datasource.documentation.length > 0) {
            console.log(`[BASH TOOL] Loading ${datasource.documentation.length} documentation file(s)`);
            for (const doc of datasource.documentation) {
              const docPath = `/docs/${doc.filename}`;
              await sandbox.writeFiles([{
                path: docPath,
                content: Buffer.from(doc.markdown_content, 'utf-8'),
              }]);
            }
          }

          // 5. Esegui il comando con timeout
          console.log(`[BASH TOOL] Executing command: ${command}`);
          
          // Crea un AbortController per gestire il timeout
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), safeTimeout);
          
          try {
            const result = await sandbox.runCommand({
              cmd: 'bash',
              args: ['-c', command],
              cwd: workingDirectory,
              env: envVars,
              signal: abortController.signal,
            });
            
            clearTimeout(timeoutId);

            console.log(`[BASH TOOL] Command completed with exit code ${result.exitCode}`);

            return {
              success: result.exitCode === 0,
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
              command,
              workingDirectory,
              datasourceName: datasource.source_name,
              datasourceType: dbType,
            };
          } catch (abortError) {
            clearTimeout(timeoutId);
            
            if (abortError instanceof Error && abortError.name === 'AbortError') {
              return {
                success: false,
                exitCode: 124, // Timeout exit code
                stdout: '',
                stderr: `Command timed out after ${safeTimeout}ms`,
                command,
                workingDirectory,
                error: {
                  type: 'TIMEOUT',
                  message: `Command execution exceeded ${safeTimeout}ms timeout`,
                  hint: 'Try increasing the timeout or optimizing your query.',
                },
              };
            }
            
            throw abortError;
          }
        } finally {
          // 6. Cleanup: stoppa il sandbox
          await sandbox.stop();
          console.log(`[BASH TOOL] Sandbox stopped`);
        }

      } catch (error) {
        console.error('[BASH TOOL] Execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: errorMessage,
          command,
          workingDirectory,
          error: {
            type: 'EXECUTION_ERROR',
            message: errorMessage,
            hint: 'Check if the command syntax is correct and all required tools are available in the sandbox.',
          },
        };
      }
    },
  });
}

// Note: bashTool now requires userId context, so it must be created with createBashTool({ userId })
// No default export without context
