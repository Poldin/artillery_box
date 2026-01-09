/**
 * API Routes per gestire le Data Sources
 * 
 * GET - Lista tutte le data sources dell'utente
 * POST - Crea una nuova data source
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { encryptApiKey } from '@/app/lib/crypto';

// GET - Lista data sources
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    
    const { data, error } = await serviceClient
      .from('data_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/data-sources] List error:', error);
      return NextResponse.json({ error: 'Failed to fetch data sources' }, { status: 500 });
    }

    // Rimuovi le password cifrate dalla risposta
    const safeSources = data?.map((source: any) => {
      if (source.config?.password) {
        const { password, ...safeConfig } = source.config;
        return { ...source, config: { ...safeConfig, hasPassword: true } };
      }
      return source;
    });

    return NextResponse.json({ dataSources: safeSources || [] });

  } catch (error) {
    console.error('[API/data-sources] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Crea data source
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, config } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cifra la password se presente
    let safeConfig = { ...config };
    if (config?.password) {
      safeConfig.password = encryptApiKey(config.password);
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from('data_sources')
      .insert({
        user_id: user.id,
        source_name: name,
        config: {
          type,
          ...safeConfig,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('[API/data-sources] Create error:', error);
      return NextResponse.json({ error: 'Failed to create data source' }, { status: 500 });
    }

    // Rimuovi password dalla risposta
    if (data.config?.password) {
      const { password, ...safeResponseConfig } = data.config;
      data.config = { ...safeResponseConfig, hasPassword: true };
    }

    return NextResponse.json({ dataSource: data }, { status: 201 });

  } catch (error) {
    console.error('[API/data-sources] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
