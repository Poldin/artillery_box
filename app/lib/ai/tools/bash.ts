import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';
import { createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';
import { getSandboxPool } from './sandbox-pool';

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
      workingDirectory: z.string().optional().describe('Working directory for the command (default: /tmp)'),
      timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000, max: 120000)'),
    }),
    execute: async ({ datasourceId, command, workingDirectory = '/tmp', timeout = 30000 }) => {
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

        // 3. Ottieni un sandbox dal pool (riutilizza se disponibile)
        console.log(`[BASH TOOL] Acquiring sandbox for datasource '${datasource.source_name}' (${dbType})`);
        const pool = getSandboxPool();
        const poolStats = pool.getStats();
        console.log(`[BASH TOOL] Pool stats:`, poolStats);
        
        let sandbox = await pool.acquire('node24', safeTimeout + 10000);
        let shouldRelease = true; // Flag per rilasciare il sandbox nel pool
        let retryCount = 0;
        const maxRetries = 1;

        // Retry loop per gestire sandbox "morti"
        while (retryCount <= maxRetries) {
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
              const cmdResult = await sandbox.runCommand({
                cmd: 'bash',
                args: ['-c', command],
                cwd: workingDirectory,
                env: envVars,
                signal: abortController.signal,
              });
            
              clearTimeout(timeoutId);

              // Leggi stdout e stderr come metodi asincroni
              const stdout = await cmdResult.stdout();
              const stderr = await cmdResult.stderr();

              console.log(`[BASH TOOL] Command completed with exit code ${cmdResult.exitCode}`);
              console.log(`[BASH TOOL] stdout length: ${stdout?.length || 0}`);
              console.log(`[BASH TOOL] stderr length: ${stderr?.length || 0}`);
              if (stdout) console.log(`[BASH TOOL] stdout preview:`, stdout.substring(0, 200));

              // Successo! Rilascia il sandbox nel pool
              pool.release(sandbox);
              console.log(`[BASH TOOL] Sandbox released back to pool`);

              return {
                success: cmdResult.exitCode === 0,
                exitCode: cmdResult.exitCode,
                stdout: stdout || '',
                stderr: stderr || '',
                command,
                workingDirectory,
                datasourceName: datasource.source_name,
                datasourceType: dbType,
              };
            } catch (abortError) {
              clearTimeout(timeoutId);
              
              if (abortError instanceof Error && abortError.name === 'AbortError') {
                pool.release(sandbox);
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
          } catch (sandboxError) {
            // Gestione errori specifici del sandbox
            const errorMessage = sandboxError instanceof Error ? sandboxError.message : String(sandboxError);
            
            // Errore 410 = sandbox morto/fermato - rimuovi dal pool e riprova con uno nuovo
            if (errorMessage.includes('410') || errorMessage.includes('sandbox_stopped') || errorMessage.includes('Gone')) {
              console.log(`[BASH TOOL] Sandbox stopped/dead (410), removing from pool and retrying with new sandbox`);
              pool.remove(sandbox);
              shouldRelease = false; // Non rilasciare questo sandbox
              
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`[BASH TOOL] Retry attempt ${retryCount}/${maxRetries}`);
                // Ottieni un nuovo sandbox
                sandbox = await pool.acquire('node24', safeTimeout + 10000);
                shouldRelease = true;
                continue; // Riprova con il nuovo sandbox
              } else {
                return {
                  success: false,
                  exitCode: 1,
                  stdout: '',
                  stderr: 'Sandbox stopped unexpectedly. All retry attempts failed.',
                  command,
                  workingDirectory,
                  error: {
                    type: 'SANDBOX_STOPPED',
                    message: 'The sandbox was stopped by Vercel and could not be recovered.',
                    hint: 'This may be due to inactivity timeout. Try running the command again.',
                  },
                };
              }
            }
            
            // Altri errori - propaga
            throw sandboxError;
          }
        }

      } catch (error) {
        console.error('[BASH TOOL] Execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Check for rate limiting
        if (errorMessage.includes('429') || errorMessage.includes('rate_limited') || errorMessage.includes('Too Many Requests')) {
          return {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: 'Vercel Sandbox rate limit reached. Please wait a few minutes before trying again.',
            command,
            workingDirectory,
            error: {
              type: 'RATE_LIMITED',
              message: 'Too many sandbox requests. Rate limit exceeded.',
              hint: 'Wait 2-3 minutes before running more database queries. The free tier has a limit of 40 sandboxes per time window.',
            },
          };
        }
        
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
