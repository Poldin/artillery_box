import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase/server';

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { link_id, customer_id } = await request.json();

    if (!link_id || !customer_id) {
      return NextResponse.json(
        { error: 'Missing required fields: link_id, customer_id' },
        { status: 400 }
      );
    }

    // Verify the requesting user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the link belongs to a partner owned by this user
    const { data: link, error: linkError } = await supabase
      .from('link_partner_customers')
      .select('*, partners!inner(user_id)')
      .eq('id', link_id)
      .eq('customer_id', customer_id)
      .single();

    if (linkError || !link) {
      console.error('Link error:', linkError);
      return NextResponse.json({ error: 'Customer link not found' }, { status: 404 });
    }

    // Check if the partner belongs to the current user
    if (link.partners.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this customer' }, { status: 403 });
    }

    // Use service client for admin operations
    const adminClient = createServiceClient();

    // Delete the link
    const { error: deleteLinkError } = await adminClient
      .from('link_partner_customers')
      .delete()
      .eq('id', link_id);

    if (deleteLinkError) {
      console.error('Delete link error:', deleteLinkError);
      return NextResponse.json({ error: 'Failed to delete customer link' }, { status: 500 });
    }

    // Optional: Also delete the auth user if they have no other partner links
    // Check if customer has other partner links
    const { data: otherLinks, error: otherLinksError } = await adminClient
      .from('link_partner_customers')
      .select('id')
      .eq('customer_id', customer_id);

    if (!otherLinksError && (!otherLinks || otherLinks.length === 0)) {
      // No other links, delete the user
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(customer_id);
      
      if (deleteUserError) {
        console.error('Delete user error:', deleteUserError);
        // Don't fail the whole operation if user deletion fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Customer deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
