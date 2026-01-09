/**
 * API Route per testare la connessione a una Data Source
 * 
 * POST - Testa la connessione
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';
import type * as mssql from 'mssql';

// POST - Test connessione
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    const config = dataSource.config || {};
    const dbType = config.type;

    // Decifra la password se presente
    let password: string | undefined;
    if (config.password && typeof config.password === 'string' && config.password.length > 0) {
      try {
        const decrypted = decryptApiKey(config.password);
        // Assicurati che la password decifrata sia una stringa non vuota
        if (decrypted && typeof decrypted === 'string' && decrypted.length > 0) {
          password = decrypted;
        }
      } catch (decryptError) {
        console.error('[API/data-sources/test] Decrypt error:', decryptError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to decrypt password. Please re-save the data source with your password.' 
        });
      }
    }

    // Verifica che abbiamo le credenziali necessarie (tranne MongoDB che può essere senza auth)
    if (dbType !== 'mongodb' && dbType !== 'sqlite' && !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password not found. Please edit the data source and re-enter your password.' 
      });
    }

    // Test connessione in base al tipo di database
    const startTime = Date.now();
    let result: { success: boolean; message?: string; error?: string; latency?: number };

    try {
      switch (dbType) {
        case 'postgresql':
          result = await testPostgreSQL(config, password);
          break;
        case 'mysql':
        case 'mariadb':
          result = await testMySQL(config, password);
          break;
        case 'sqlserver':
          result = await testSQLServer(config, password);
          break;
        case 'mongodb':
          result = await testMongoDB(config, password);
          break;
        case 'sqlite':
          result = await testSQLite(config);
          break;
        default:
          result = { success: false, error: `Unsupported database type: ${dbType}` };
      }
    } catch (err) {
      result = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Connection failed'
      };
    }

    const latency = Date.now() - startTime;

    // Salva il risultato del test nel database
    const testResult = {
      success: result.success,
      message: result.message,
      error: result.error,
      latency: `${latency}ms`,
      testedAt: new Date().toISOString(),
    };

    // Aggiorna la data source con il risultato del test
    await serviceClient
      .from('data_sources')
      .update({
        config: {
          ...config,
          lastTest: testResult,
        },
      })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({
      ...result,
      latency: `${latency}ms`,
    });

  } catch (error) {
    console.error('[API/data-sources/test] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

// Test PostgreSQL
async function testPostgreSQL(
  config: Record<string, unknown>, 
  password?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
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
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT version()');
    const version = res.rows[0]?.version?.split(' ').slice(0, 2).join(' ') || 'PostgreSQL';
    await client.end();
    return { success: true, message: `Connected to ${version}` };
  } catch (err) {
    try { await client.end(); } catch { /* ignore */ }
    throw err;
  }
}

// Test MySQL / MariaDB
async function testMySQL(
  config: Record<string, unknown>, 
  password?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const mysql = await import('mysql2/promise');
  
  const connection = await mysql.createConnection({
    host: config.host as string,
    port: config.port as number,
    database: config.database as string,
    user: config.username as string,
    password,
    ssl: config.sslMode === 'require' ? {} : undefined,
    connectTimeout: 10000,
  });

  try {
    const [rows] = await connection.query('SELECT VERSION() as version');
    const version = (rows as Array<{version: string}>)[0]?.version || 'MySQL';
    await connection.end();
    return { success: true, message: `Connected to MySQL ${version}` };
  } catch (err) {
    try { await connection.end(); } catch { /* ignore */ }
    throw err;
  }
}

// Test SQL Server
async function testSQLServer(
  config: Record<string, unknown>, 
  password?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
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
    connectionTimeout: 10000,
  };

  let pool: mssql.ConnectionPool | undefined;
  try {
    pool = await sql.connect(sqlConfig);
    const result = await pool.request().query('SELECT @@VERSION as version');
    const version = result.recordset[0]?.version?.split('\n')[0] || 'SQL Server';
    await pool.close();
    return { success: true, message: `Connected to ${version}` };
  } catch (err) {
    if (pool) try { await pool.close(); } catch { /* ignore */ }
    throw err;
  }
}

// Test MongoDB
async function testMongoDB(
  config: Record<string, unknown>, 
  password?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
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
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const adminDb = client.db().admin();
    const info = await adminDb.serverInfo();
    await client.close();
    return { success: true, message: `Connected to MongoDB ${info.version}` };
  } catch (err) {
    try { await client.close(); } catch { /* ignore */ }
    throw err;
  }
}

// Test SQLite
async function testSQLite(
  config: Record<string, unknown>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const Database = (await import('better-sqlite3')).default;
  
  const filePath = config.filePath as string;
  
  if (!filePath) {
    return { success: false, error: 'File path is required for SQLite' };
  }

  try {
    const db = new Database(filePath, { readonly: true });
    const result = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
    db.close();
    return { success: true, message: `Connected to SQLite ${result.version}` };
  } catch (err) {
    throw err;
  }
}
