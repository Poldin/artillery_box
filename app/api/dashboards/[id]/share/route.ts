/**
 * API Routes per gestire la condivisione di una Dashboard
 * 
 * POST - Attiva/disattiva condivisione e ritorna il link
 * GET - Ottieni lo stato di condivisione corrente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

// GET - Ottieni stato condivisione
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
      .from('dashboards')
      .select('id, is_shared, sharing_uid')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[API/dashboards/share] Get error:', error);
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      is_shared: data.is_shared,
      sharing_uid: data.sharing_uid
    });

  } catch (error) {
    console.error('[API/dashboards/share] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Attiva/disattiva condivisione
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { is_shared } = body;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifica che la dashboard appartenga all'utente
    const { data: existing } = await serviceClient
      .from('dashboards')
      .select('id, sharing_uid')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Aggiorna lo stato di condivisione
    const { data, error } = await serviceClient
      .from('dashboards')
      .update({
        is_shared,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_shared, sharing_uid')
      .single();

    if (error) {
      console.error('[API/dashboards/share] Update error:', error);
      return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 });
    }

    return NextResponse.json({ 
      is_shared: data.is_shared,
      sharing_uid: data.sharing_uid
    });

  } catch (error) {
    console.error('[API/dashboards/share] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
