import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin, hash } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this is a password recovery for an invited customer
      const isInvitedCustomer = data.user.user_metadata?.invitation_pending === true;
      const customerName = data.user.user_metadata?.name || '';
      
      if (isInvitedCustomer) {
        // Redirect to setup password page
        return NextResponse.redirect(`${origin}/auth/setup-password?name=${encodeURIComponent(customerName)}`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to homepage with error indicator
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
