import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: partner_id' },
        { status: 400 }
      );
    }

    // Verify the requesting user is the partner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner_id)
      .eq('user_id', user.id)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partner not found or unauthorized' }, { status: 403 });
    }

    // Get customer links
    const { data: links, error: linksError } = await supabase
      .from('link_partner_customers')
      .select('*')
      .eq('partner_id', partner_id);

    if (linksError) {
      console.error('Links error:', linksError);
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ customers: [] });
    }

    // Use service client to get user emails from auth.users
    const adminClient = createServiceClient();
    const customerIds = links.map(link => link.customer_id);

    // Get user details for all customers
    const customersWithDetails = await Promise.all(
      links.map(async (link) => {
        try {
          const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(link.customer_id);
          
          if (userError || !userData.user) {
            console.error(`Error fetching user ${link.customer_id}:`, userError);
            return {
              ...link,
              customer_email: link.metadata?.email || 'N/A',
              customer_name: link.metadata?.name || 'N/A',
            };
          }

          return {
            ...link,
            customer_email: userData.user.email || 'N/A',
            customer_name: userData.user.user_metadata?.name || link.metadata?.name || 'N/A',
          };
        } catch (err) {
          console.error(`Error processing user ${link.customer_id}:`, err);
          return {
            ...link,
            customer_email: link.metadata?.email || 'N/A',
            customer_name: link.metadata?.name || 'N/A',
          };
        }
      })
    );

    return NextResponse.json({ customers: customersWithDetails });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
