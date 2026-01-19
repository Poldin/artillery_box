import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateEmailTemplate } from '@/app/lib/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { 
      to, 
      subject, 
      title, 
      content, 
      from = 'Vetrinae <team@vetrinae.xyz>' 
    } = await request.json();

    if (!to || !subject || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, title, content' },
        { status: 400 }
      );
    }

    // Generate HTML using the template
    const html = generateEmailTemplate({ title, content });

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
