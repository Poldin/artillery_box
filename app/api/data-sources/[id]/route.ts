/**
 * API Routes per gestire una singola Data Source
 * 
 * GET - Dettagli data source
 * PUT - Aggiorna data source
 * DELETE - Elimina data source
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { encryptApiKey } from '@/app/lib/crypto';

// GET - Dettagli data source
export async function GET(
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

    const { data, error } = await serviceClient
      .from('data_sources')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[API/data-sources/id] Get error:', error);
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Rimuovi password dalla risposta
    if (data.config?.password) {
      const { password, ...safeConfig } = data.config;
      data.config = { ...safeConfig, hasPassword: true };
    }

    return NextResponse.json({ dataSource: data });

  } catch (error) {
    console.error('[API/data-sources/id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Aggiorna data source
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, config } = body;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifica che la data source appartenga all'utente
    const { data: existing } = await serviceClient
      .from('data_sources')
      .select('id, config')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Prepara config - cifra password se nuova, altrimenti mantieni quella esistente
    let safeConfig = { ...config };
    if (config?.password) {
      // Nuova password fornita, cifrala
      safeConfig.password = encryptApiKey(config.password);
    } else if (existing.config?.password) {
      // Mantieni la password esistente
      safeConfig.password = existing.config.password;
    }

    const { data, error } = await serviceClient
      .from('data_sources')
      .update({
        source_name: name,
        config: {
          type,
          ...safeConfig,
        },
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[API/data-sources/id] Update error:', error);
      return NextResponse.json({ error: 'Failed to update data source' }, { status: 500 });
    }

    // Rimuovi password dalla risposta
    if (data.config?.password) {
      const { password, ...safeResponseConfig } = data.config;
      data.config = { ...safeResponseConfig, hasPassword: true };
    }

    return NextResponse.json({ dataSource: data });

  } catch (error) {
    console.error('[API/data-sources/id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Elimina data source
export async function DELETE(
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

    const { error } = await serviceClient
      .from('data_sources')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[API/data-sources/id] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete data source' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API/data-sources/id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
