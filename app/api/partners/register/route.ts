import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, metadata } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient();
    
    const { data, error } = await serviceClient
      .from('partners')
      .insert({
        user_id: user.id,
        name,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[API/partners] Error creating partner:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, partner: data }, { status: 201 });
  } catch (error) {
    console.error('[API/partners] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
