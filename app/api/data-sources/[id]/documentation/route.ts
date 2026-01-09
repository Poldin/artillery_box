/**
 * API Routes per gestire la documentazione di una Data Source
 * 
 * GET - Lista tutti i documenti associati a una data source
 * POST - Crea un nuovo documento
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

// GET - Lista documenti
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

    // Verifica che la data source appartenga all'utente
    const { data: dataSource } = await serviceClient
      .from('data_sources')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Recupera i documenti
    const { data, error } = await serviceClient
      .from('documentation')
      .select('*')
      .eq('datasource_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/documentation] List error:', error);
      return NextResponse.json({ error: 'Failed to fetch documentation' }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });

  } catch (error) {
    console.error('[API/documentation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Crea documento
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { filename, markdown_content } = body;

    if (!filename || !markdown_content) {
      return NextResponse.json({ error: 'Filename and content are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifica che la data source appartenga all'utente
    const { data: dataSource } = await serviceClient
      .from('data_sources')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Crea il documento
    const { data, error } = await serviceClient
      .from('documentation')
      .insert({
        datasource_id: id,
        filename,
        markdown_content,
      })
      .select()
      .single();

    if (error) {
      console.error('[API/documentation] Create error:', error);
      return NextResponse.json({ error: 'Failed to create documentation' }, { status: 500 });
    }

    return NextResponse.json({ document: data }, { status: 201 });

  } catch (error) {
    console.error('[API/documentation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
