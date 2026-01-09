/**
 * API Route per aggiornare il modello selezionato
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

// PUT - Aggiorna il modello selezionato
export async function PUT(req: NextRequest) {
  try {
    const { model } = await req.json();

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    // Verifica autenticazione utente
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Usa service client per bypassare RLS
    const serviceClient = createServiceClient();

    // Aggiorna o crea le impostazioni utente
    const { error } = await serviceClient
      .from('user_ai_settings')
      .upsert({
        user_id: user.id,
        provider: 'anthropic',
        model,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (error) {
      console.error('[API/settings/model] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update model' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      model,
    });

  } catch (error) {
    console.error('[API/settings/model] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
