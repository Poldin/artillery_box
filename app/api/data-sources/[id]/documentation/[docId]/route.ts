/**
 * API Routes per gestire un singolo documento
 * 
 * GET - Ottieni dettagli documento
 * PUT - Aggiorna documento
 * DELETE - Elimina documento
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

// GET - Ottieni documento
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    
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

    // Recupera il documento
    const { data, error } = await serviceClient
      .from('documentation')
      .select('*')
      .eq('id', docId)
      .eq('datasource_id', id)
      .single();

    if (error) {
      console.error('[API/documentation/docId] Get error:', error);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document: data });

  } catch (error) {
    console.error('[API/documentation/docId] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Aggiorna documento
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
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

    // Aggiorna il documento
    const { data, error } = await serviceClient
      .from('documentation')
      .update({
        filename,
        markdown_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .eq('datasource_id', id)
      .select()
      .single();

    if (error) {
      console.error('[API/documentation/docId] Update error:', error);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    return NextResponse.json({ document: data });

  } catch (error) {
    console.error('[API/documentation/docId] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Elimina documento
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

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

    // Elimina il documento
    const { error } = await serviceClient
      .from('documentation')
      .delete()
      .eq('id', docId)
      .eq('datasource_id', id);

    if (error) {
      console.error('[API/documentation/docId] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API/documentation/docId] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
