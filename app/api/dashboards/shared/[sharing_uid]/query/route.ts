/**
 * API Route pubblica per eseguire query di widget dinamici su dashboard condivise
 * 
 * POST - Esegue una query per un widget di una dashboard condivisa (no auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/app/lib/supabase';
import { decryptApiKey } from '@/app/lib/crypto';

interface ExecuteQueryRequest {
  widgetId: string;
}

// POST - Esegui query per widget di dashboard condivisa
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sharing_uid: string }> }
) {
  try {
    const { sharing_uid } = await params;
    const body: ExecuteQueryRequest = await req.json();
    const { widgetId } = body;

    if (!widgetId) {
      return NextResponse.json({ error: 'Missing widgetId' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Verifica che la dashboard sia condivisa e recupera i widget
    const { data: dashboard, error: dashError } = await serviceClient
      .from('dashboards')
      .select('id, user_id, widgets')
      .eq('sharing_uid', sharing_uid)
      .eq('is_shared', true)
      .single();

    if (dashError || !dashboard) {
      return NextResponse.json({ error: 'Dashboard not found or not shared' }, { status: 404 });
    }

    // Trova il widget richiesto
    const widgets = dashboard.widgets as Array<{
      id: string;
      isDynamic?: boolean;
      dataSource?: { datasourceId: string; query: string };
    }>;
    
    const widget = widgets.find(w => w.id === widgetId);
    
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    if (!widget.isDynamic || !widget.dataSource) {
      return NextResponse.json({ error: 'Widget is not dynamic' }, { status: 400 });
    }

    // Recupera la data source (deve appartenere al proprietario della dashboard)
    const { data: dataSource, error: dsError } = await serviceClient
      .from('data_sources')
      .select('*')
      .eq('id', widget.dataSource.datasourceId)
      .eq('user_id', dashboard.user_id)
      .single();

    if (dsError || !dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    const config = dataSource.config || {};
    const dbType = config.type;

    // Decifra la password
    let password: string | undefined;
    if (config.password && typeof config.password === 'string' && config.password.length > 0) {
      try {
        const decrypted = decryptApiKey(config.password);
        if (decrypted && typeof decrypted === 'string' && decrypted.length > 0) {
          password = decrypted;
        }
      } catch (decryptError) {
        console.error('[API/shared/query] Decrypt error:', decryptError);
        return NextResponse.json({ success: false, error: 'Failed to decrypt password' });
      }
    }

    // Verifica credenziali
    if (dbType !== 'mongodb' && dbType !== 'sqlite' && !password) {
      return NextResponse.json({ success: false, error: 'Password not found' });
    }

    // Esegui query
    const startTime = Date.now();
    let result: { success: boolean; data?: unknown[]; columns?: string[]; error?: string };

    try {
      switch (dbType) {
        case 'postgresql':
          result = await executePostgreSQL(config, password, widget.dataSource.query);
          break;
        case 'mysql':
        case 'mariadb':
          result = await executeMySQL(config, password, widget.dataSource.query);
          break;
        default:
          result = { success: false, error: `Database type ${dbType} not supported for shared dashboards` };
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
    console.error('[API/shared/query] Error:', error);
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
