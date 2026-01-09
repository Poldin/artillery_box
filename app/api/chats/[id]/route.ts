import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';

/**
 * API per gestire una chat specifica
 * GET /api/chats/[id] - Ottieni una chat
 * PATCH /api/chats/[id] - Aggiorna una chat
 * DELETE /api/chats/[id] - Elimina una chat
 */

// GET - Ottieni una chat specifica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Unwrap params Promise
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();
    
    const { data: chat, error } = await serviceClient
      .from('chats')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('[API/chats/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Aggiorna una chat
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Unwrap params Promise
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, messages } = body;

    // Valida che messages sia un array se fornito
    if (messages !== undefined && !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages must be an array' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    
    // Costruisci l'oggetto di update
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (messages !== undefined) {
      updateData.messages = messages;
      updateData.message_count = messages.length;
    }

    const { data: chat, error } = await serviceClient
      .from('chats')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !chat) {
      console.error('[API/chats/[id]] Error updating chat:', error);
      return NextResponse.json(
        { error: 'Failed to update chat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('[API/chats/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina una chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Unwrap params Promise
    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();
    
    const { error } = await serviceClient
      .from('chats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[API/chats/[id]] Error deleting chat:', error);
      return NextResponse.json(
        { error: 'Failed to delete chat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/chats/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
