/**
 * API Route pubblica per ottenere una dashboard condivisa
 * 
 * GET - Ottieni dashboard tramite sharing_uid (pubblico, no auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/app/lib/supabase';

// GET - Ottieni dashboard condivisa (pubblico)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sharing_uid: string }> }
) {
  try {
    const { sharing_uid } = await params;
    
    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from('dashboards')
      .select('id, name, description, widgets, layout_config, created_at, updated_at')
      .eq('sharing_uid', sharing_uid)
      .eq('is_shared', true)
      .single();

    if (error || !data) {
      console.error('[API/dashboards/shared] Get error:', error);
      return NextResponse.json({ error: 'Dashboard not found or not shared' }, { status: 404 });
    }

    return NextResponse.json({ dashboard: data });

  } catch (error) {
    console.error('[API/dashboards/shared] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
