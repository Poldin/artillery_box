/**
 * API Routes per gestire le API key in modo sicuro
 * Usa cifratura AES-256 per salvare le chiavi nel database
 * 
 * POST - Salva una nuova API key (cifrata)
 * GET - Verifica se l'utente ha una API key configurata
 * DELETE - Elimina l'API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { encryptApiKey } from '@/app/lib/crypto';

// POST - Salva API key (cifrata)
export async function POST(req: NextRequest) {
  try {
    const { apiKey, provider = 'anthropic' } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Verifica autenticazione utente
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', hint: 'Please sign in to save your API key' },
        { status: 401 }
      );
    }

    // Cifra l'API key
    const encryptedKey = encryptApiKey(apiKey);

    // Usa service client per bypassare RLS
    const serviceClient = createServiceClient();

    // Salva l'API key cifrata nella tabella
    const { error } = await serviceClient
      .from('user_ai_settings')
      .upsert({
        user_id: user.id,
        provider,
        encrypted_api_key: encryptedKey,
        has_api_key: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (error) {
      console.error('[API/settings/api-key] Save error:', error);
      return NextResponse.json(
        { error: 'Failed to save API key', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key saved securely',
    });

  } catch (error) {
    console.error('[API/settings/api-key] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Verifica se l'utente ha una API key e recupera le impostazioni
export async function GET() {
  try {
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

    // Recupera le impostazioni utente
    const { data: settings, error: settingsError } = await serviceClient
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'anthropic')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (OK, utente non ha ancora impostazioni)
      console.error('[API/settings/api-key] Settings error:', settingsError);
    }

    return NextResponse.json({
      hasApiKey: settings?.has_api_key || false,
      model: settings?.model || 'claude-sonnet-4-5-20250929',
      provider: settings?.provider || 'anthropic',
    });

  } catch (error) {
    console.error('[API/settings/api-key] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina l'API key
export async function DELETE() {
  try {
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
    
    // Rimuovi la chiave cifrata
    const { error } = await serviceClient
      .from('user_ai_settings')
      .update({
        encrypted_api_key: null,
        has_api_key: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'anthropic');

    if (error) {
      console.error('[API/settings/api-key] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted',
    });

  } catch (error) {
    console.error('[API/settings/api-key] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
