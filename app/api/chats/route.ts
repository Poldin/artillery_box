import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

/**
 * API per gestire le chat
 * POST /api/chats - Crea una nuova chat
 * GET /api/chats - Ottieni tutte le chat dell'utente
 */

// GET - Lista chat dell'utente
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();
    
    const { data: chats, error } = await serviceClient
      .from('chats')
      .select('id, title, created_at, updated_at, message_count')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[API/chats] Error fetching chats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('[API/chats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Crea una nuova chat
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, messages = [] } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages must be an array' },
        { status: 400 }
      );
    }

    // Genera titolo automatico se non fornito (dal primo messaggio user)
    let chatTitle = title;
    if (!chatTitle && messages.length > 0) {
      const firstUserMessage = messages.find((m: any) => m.role === 'user');
      if (firstUserMessage?.content) {
        chatTitle = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }

    const serviceClient = createServiceClient();
    
    const { data: chat, error } = await serviceClient
      .from('chats')
      .insert({
        user_id: user.id,
        title: chatTitle || 'New chat',
        messages,
        message_count: messages.length,
      })
      .select()
      .single();

    if (error) {
      console.error('[API/chats] Error creating chat:', error);
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('[API/chats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
