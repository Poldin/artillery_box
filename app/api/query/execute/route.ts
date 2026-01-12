/**
 * API Route per eseguire query dinamiche su Data Sources
 * 
 * POST - Esegue una query su una data source specifica
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';
import type * as mssql from 'mssql';

interface ExecuteQueryRequest {
  datasourceId: string;
  query: string;
}

// POST - Esegui query
export async function POST(req: NextRequest) {
  try {
    const body: ExecuteQueryRequest = await req.json();
    const { datasourceId, query } = body;

    if (!datasourceId || !query) {
      return NextResponse.json(
        { error: 'Missing datasourceId or query' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Recupera la data source
    const { data: dataSource, error } = await serviceClient
      .from('data_sources')
      .select('*')
      .eq('id', datasourceId)
      .eq('user_id', user.id)
      .single();

    if (error || !dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    const config = dataSource.config || {};
    const dbType = config.type;

    // Decifra la password se presente
    let password: string | undefined;
    if (config.password && typeof config.password === 'string' && config.password.length > 0) {
      try {
        const decrypted = decryptApiKey(config.password);
        if (decrypted && typeof decrypted === 'string' && decrypted.length > 0) {
          password = decrypted;
        }
      } catch (decryptError) {
        console.error('[API/query/execute] Decrypt error:', decryptError);
        return NextResponse.json({
          success: false,
          error: 'Failed to decrypt password',
        });
      }
    }

    // Verifica credenziali (tranne MongoDB e SQLite che possono essere senza auth)
    if (dbType !== 'mongodb' && dbType !== 'sqlite' && !password) {
      return NextResponse.json({
        success: false,
        error: 'Password not found',
      });
    }

    // Esegui query in base al tipo di database
    const startTime = Date.now();
    let result: { success: boolean; data?: unknown[]; columns?: string[]; error?: string };

    try {
      switch (dbType) {
        case 'postgresql':
          result = await executePostgreSQL(config, password, query);
          break;
        case 'mysql':
        case 'mariadb':
          result = await executeMySQL(config, password, query);
          break;
        case 'sqlserver':
          result = await executeSQLServer(config, password, query);
          break;
        case 'mongodb':
          result = await executeMongoDB(config, password, query);
          break;
        case 'sqlite':
          result = await executeSQLite(config, query);
          break;
        default:
          result = { success: false, error: `Unsupported database type: ${dbType}` };
      }
    } catch (err) {
      result = {
        success: false,
        error: err instanceof Error ? err.message : 'Query execution failed',
      };
    }

    const latency = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      latency: `${latency}ms`,
      executedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API/query/execute] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

// Execute PostgreSQL query
async function executePostgreSQL(
  config: Record<string, unknown>,
  password: string | undefined,
  query: string
): Promise<{ success: boolean; data?: unknown[]; columns?: string[]; error?: string }> {
  const { Client } = await import('pg');

  const client = new Client({
    host: config.host as string,
    port: config.port as number,
    database: config.database as string,
    user: config.username as string,
    password,
    ssl: config.sslMode === 'require' || config.sslMode === 'verify-ca' || config.sslMode === 'verify-full'
      ? { rejectUnauthorized: config.sslMode !== 'require' }
      : false,
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    const res = await client.query(query);
    const columns = res.fields.map(f => f.name);
    await client.end();
    return { success: true, data: res.rows, columns };
  } catch (err) {
    try { await client.end(); } catch { /* ignore */ }
    throw err;
  }
}

// Execute MySQL / MariaDB query
async function executeMySQL(
  config: Record<string, unknown>,
  password: string | undefined,
  query: string
): Promise<{ success: boolean; data?: unknown[]; columns?: string[]; error?: string }> {
  const mysql = await import('mysql2/promise');

  const connection = await mysql.createConnection({
    host: config.host as string,
    port: config.port as number,
    database: config.database as string,
    user: config.username as string,
    password,
    ssl: config.sslMode === 'require' ? {} : undefined,
    connectTimeout: 30000,
  });

  try {
    const [rows, fields] = await connection.query(query);
    const columns = Array.isArray(fields) ? fields.map((f: { name: string }) => f.name) : [];
    await connection.end();
    return { success: true, data: rows as unknown[], columns };
  } catch (err) {
    try { await connection.end(); } catch { /* ignore */ }
    throw err;
  }
}

// Execute SQL Server query
async function executeSQLServer(
  config: Record<string, unknown>,
  password: string | undefined,
  query: string
): Promise<{ success: boolean; data?: unknown[]; columns?: string[]; error?: string }> {
  const sql = await import('mssql');

  const sqlConfig: mssql.config = {
    server: config.host as string,
    port: config.port as number,
    database: config.database as string,
    user: config.username as string,
    password,
    options: {
      encrypt: config.encrypt as boolean ?? true,
      trustServerCertificate: config.trustServerCertificate as boolean ?? false,
      instanceName: config.instanceName as string | undefined,
    },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  };

  let pool: mssql.ConnectionPool | undefined;
  try {
    pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(query);
    const columns = result.recordset.columns ? Object.keys(result.recordset.columns) : [];
    await pool.close();
    return { success: true, data: result.recordset, columns };
  } catch (err) {
    if (pool) try { await pool.close(); } catch { /* ignore */ }
    throw err;
  }
}

// Execute MongoDB query (usando aggregation pipeline o find)
async function executeMongoDB(
  config: Record<string, unknown>,
  password: string | undefined,
  queryStr: string
): Promise<{ success: boolean; data?: unknown[]; columns?: string[]; error?: string }> {
  const { MongoClient } = await import('mongodb');

  let uri: string;
  const host = config.host as string;
  const port = config.port as number;
  const database = config.database as string;
  const username = config.username as string;
  const authDatabase = config.authDatabase as string || 'admin';

  if (username && password) {
    uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=${authDatabase}`;
  } else {
    uri = `mongodb://${host}:${port}/${database}`;
  }

  if (config.tls) {
    uri += uri.includes('?') ? '&tls=true' : '?tls=true';
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
  });

  try {
    await client.connect();
    
    // Parse query (assume JSON format: {"collection": "...", "query": {...}} o aggregation)
    let queryObj: { collection: string; query?: unknown; aggregation?: unknown[] };
    try {
      queryObj = JSON.parse(queryStr);
    } catch {
      throw new Error('MongoDB query must be valid JSON with "collection" and "query" or "aggregation" fields');
    }

    const db = client.db();
    const collection = db.collection(queryObj.collection);

    let results: unknown[];
    if (queryObj.aggregation && Array.isArray(queryObj.aggregation)) {
      results = await collection.aggregate(queryObj.aggregation as Record<string, unknown>[]).toArray();
    } else {
      results = await collection.find(queryObj.query || {}).toArray();
    }

    // Estrai colonne dal primo documento
    const columns = results.length > 0 ? Object.keys(results[0] as Record<string, unknown>) : [];

    await client.close();
    return { success: true, data: results, columns };
  } catch (err) {
    try { await client.close(); } catch { /* ignore */ }
    throw err;
  }
}

// Execute SQLite query
async function executeSQLite(
  config: Record<string, unknown>,
  query: string
): Promise<{ success: boolean; data?: unknown[]; columns?: string[]; error?: string }> {
  const Database = (await import('better-sqlite3')).default;

  const filePath = config.filePath as string;

  if (!filePath) {
    return { success: false, error: 'File path is required for SQLite' };
  }

  try {
    const db = new Database(filePath, { readonly: true });
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    // Estrai colonne
    const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
    
    db.close();
    return { success: true, data: rows, columns };
  } catch (err) {
    throw err;
  }
}
