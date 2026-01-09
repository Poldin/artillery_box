/**
 * API Routes per gestire le Dashboards
 * 
 * GET - Lista tutte le dashboards dell'utente
 * POST - Crea una nuova dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

// GET - Lista dashboards
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    
    const { data, error } = await serviceClient
      .from('dashboards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/dashboards] List error:', error);
      return NextResponse.json({ error: 'Failed to fetch dashboards' }, { status: 500 });
    }

    return NextResponse.json({ dashboards: data || [] });

  } catch (error) {
    console.error('[API/dashboards] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Crea dashboard
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, widgets, layout_config } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from('dashboards')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        widgets: widgets || [],
        layout_config: layout_config || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[API/dashboards] Create error:', error);
      return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
    }

    return NextResponse.json({ dashboard: data }, { status: 201 });

  } catch (error) {
    console.error('[API/dashboards] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
