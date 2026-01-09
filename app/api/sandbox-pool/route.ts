import { NextResponse } from 'next/server';
import { getSandboxPool } from '@/app/lib/ai/tools/sandbox-pool';
import { createServerSupabaseClient } from '@/app/lib/supabase';

/**
 * API endpoint per monitorare il pool di sandbox
 * GET /api/sandbox-pool - Ottieni statistiche del pool
 */
export async function GET() {
  try {
    // Verifica autenticazione
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pool = getSandboxPool();
    const stats = pool.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API/sandbox-pool] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get pool stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
