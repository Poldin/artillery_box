import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/app/lib/supabase/server';
import { Resend } from 'resend';
import { generateEmailTemplate } from '@/app/lib/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // Use regular client for auth check
    const supabase = await createServerSupabaseClient();
    const { partner_id, name, email } = await request.json();

    if (!partner_id || !name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: partner_id, name, email' },
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

    // Use service client for admin operations
    const adminClient = createServiceClient();
    
    // Create a temporary user account with a random password
    const temporaryPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
    
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: false,
      user_metadata: {
        name,
        invited_by_partner: partner_id,
        invitation_pending: true,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Create link between partner and customer
    const { error: linkError } = await adminClient
      .from('link_partner_customers')
      .insert({
        partner_id,
        customer_id: authData.user.id,
        metadata: { 
          name, 
          email,
          invited_at: new Date().toISOString() 
        },
      });

    if (linkError) {
      console.error('Link error:', linkError);
      // Cleanup: delete the created user if linking fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to create customer link' }, { status: 500 });
    }

    // Generate password reset token
    const { data: resetData, error: resetError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (resetError || !resetData.properties?.action_link) {
      console.error('Reset error:', resetError);
      return NextResponse.json({ error: 'Failed to generate invitation link' }, { status: 500 });
    }

    // Modify the action link to redirect to our setup-password page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const actionUrl = new URL(resetData.properties.action_link);
    
    // Replace the redirect_to parameter with our custom page
    actionUrl.searchParams.set('redirect_to', `${baseUrl}/auth/setup-password?name=${encodeURIComponent(name)}`);
    
    const inviteLink = actionUrl.toString();

    // Generate email content
    const emailContent = `
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 24px;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 24px;">
        You've been invited by <strong>${partner.name}</strong> to join Vetrinae.
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 21px;">
        Click the button below to set your password and complete your registration. This link will expire in 24 hours.
      </p>
      
      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Set Your Password
            </a>
          </td>
        </tr>
      </table>
      
      <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    `;

    // Generate and send email using template
    const emailHtml = generateEmailTemplate({
      title: 'Welcome to Vetrinae',
      content: emailContent,
    });

    const { error: emailError } = await resend.emails.send({
      from: 'Vetrinae <team@vetrinae.xyz>',
      to: email,
      subject: 'Welcome to Vetrinae - Set Your Password',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      return NextResponse.json({ error: 'Failed to send invitation email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      customer_id: authData.user.id,
    });

  } catch (error) {
    console.error('Error inviting customer:', error);
    return NextResponse.json(
      { error: 'Failed to invite customer' },
      { status: 500 }
    );
  }
}
